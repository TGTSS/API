import mongoose from "mongoose";

const CotacaoSchema = new mongoose.Schema({
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fornecedor",
    required: true,
  },
  itens: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
      valor: { type: Number },
      marca: { type: String },
      desconto: { type: Number },
      condicaoPagamento: { type: String },
      prazoEntrega: { type: String },
      prazoPagamento: { type: String },
    },
  ],
  status: String,
});

const ItemSchema = new mongoose.Schema({
  insumoId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  descricao: { type: String, required: true },
  quantidade: { type: Number, required: true },
  unidade: { type: String },
  custoUnitario: { type: Number },
  etapa: { type: String },
  subetapa: { type: String },
  item: { type: String },
  isManual: { type: Boolean, default: false },
  obraId: { type: mongoose.Schema.Types.ObjectId, ref: "Obra" },
});

// Add a pre-save middleware to handle manual items
ItemSchema.pre("save", function (next) {
  if (this.isManual) {
    // For manual items, ensure insumoId is treated as a string
    this.insumoId = String(this.insumoId);
  } else {
    // For non-manual items, ensure insumoId is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(this.insumoId)) {
      this.insumoId = new mongoose.Types.ObjectId(this.insumoId);
    }
  }
  next();
});

// Add a pre-find middleware to handle population
ItemSchema.pre("find", function () {
  if (this._conditions && this._conditions.isManual) {
    // Skip population for manual items
    this.populate = function () {
      return this;
    };
  }
});

// Add a virtual for insumoId that handles both manual and regular items
ItemSchema.virtual("insumo", {
  ref: "Insumo",
  localField: "insumoId",
  foreignField: "_id",
  justOne: true,
  options: {
    match: function () {
      return { isManual: { $ne: true } };
    },
  },
});

// Ensure virtuals are included when converting to JSON
ItemSchema.set("toJSON", { virtuals: true });
ItemSchema.set("toObject", { virtuals: true });

const SolicitacaoSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    data: { type: Date, default: Date.now },
    status: {
      type: String,
      required: true,
      default: "Pendente",
    },
    prioridade: {
      type: String,
      required: true,
      enum: ["Baixa", "Média", "Alta", "Urgente"],
      default: "Média",
    },
    solicitante: { type: String, required: true },
    valor: { type: Number },
    items: [ItemSchema],
    obras: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Obra",
        required: true,
      },
    ],
    obrasNomes: [
      {
        type: String,
        required: true,
      },
    ],
    numeroSequencial: { type: Number, required: true },
    fornecedores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Fornecedor" }],
    cotacoes: [CotacaoSchema],
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
SolicitacaoSchema.index({ obras: 1, numeroSequencial: 1 }, { unique: true });
SolicitacaoSchema.index({ status: 1 });
SolicitacaoSchema.index({ prioridade: 1 });

const Solicitacao = mongoose.model("Solicitacao", SolicitacaoSchema);

export default Solicitacao;
