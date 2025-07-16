import mongoose from "mongoose";

const TransacaoIndependenteSchema = new mongoose.Schema({
  descricao: { type: String },
  valor: { type: Number },
  valorPago: { type: Number, default: 0 },
  valorRecebido: { type: Number, default: 0 },
  tipo: {
    type: String,
    enum: ["receita", "despesa"],
  },
  data: { type: Date },
  dataVencimento: { type: Date },
  status: {
    type: String,
    enum: ["pendente", "pago", "recebido", "atrasado"],
    default: "pendente",
  },
  categoria: { type: String, default: "Outros" },
  categoriaOutros: { type: String },
  centroCusto: { type: String, default: "Empresa" },
  formaPagamento: { type: String },
  beneficiario: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "beneficiarioTipo",
  },
  beneficiarioTipo: {
    type: String,
    enum: ["Fornecedor", "Funcionario"],
    default: "Fornecedor",
  },
  documento: { type: String },
  anexos: [
    {
      nome: { type: String },
      tipo: { type: String },
      tamanho: { type: Number },
      caminho: { type: String },
      dataUpload: { type: Date, default: Date.now },
    },
  ],
  // Campos para transações múltiplas
  isTransacaoMultipla: { type: Boolean, default: false },
  transacoesDivididas: [
    {
      obraId: { type: mongoose.Schema.Types.ObjectId, ref: "Obra" },
      transacaoDivididaId: { type: mongoose.Schema.Types.ObjectId },
      _id: { type: mongoose.Schema.Types.ObjectId },
    },
  ],
  transacaoPrincipalId: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware para atualizar o updatedAt
TransacaoIndependenteSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const TransacaoIndependente = mongoose.model(
  "TransacaoIndependente",
  TransacaoIndependenteSchema
);

export default TransacaoIndependente;
