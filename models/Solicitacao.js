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
    type: mongoose.Schema.Types.ObjectId,
    ref: "Insumo",
    required: function () {
      return !this.isManual;
    },
  },
  descricao: { type: String, required: true },
  quantidade: { type: Number, required: true },
  unidade: { type: String },
  custoUnitario: { type: Number },
  etapa: { type: String },
  subetapa: { type: String },
  item: { type: String },
  isManual: { type: Boolean, default: false },
});

const SolicitacaoSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    data: { type: Date, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: ["Pendente", "Aprovado", "Rejeitado", "Em cotação"],
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
SolicitacaoSchema.index({ obras: 1, numeroSequencial: 1 });
SolicitacaoSchema.index({ status: 1 });
SolicitacaoSchema.index({ prioridade: 1 });

const Solicitacao = mongoose.model("Solicitacao", SolicitacaoSchema);

export default Solicitacao;
