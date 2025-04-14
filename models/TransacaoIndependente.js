import mongoose from "mongoose";

const TransacaoIndependenteSchema = new mongoose.Schema({
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  tipo: {
    type: String,
    enum: ["receita", "despesa"],
    required: true,
  },
  data: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pendente", "recebido", "pago", "atrasado"],
    default: "pendente",
  },
  categoria: { type: String, required: true },
  categoriaOutros: { type: String },
  centroCusto: { type: String },
  dataVencimento: { type: Date },
  formaPagamento: {
    type: String,
    enum: [
      "Dinheiro",
      "PIX",
      "Cartão de Crédito",
      "Cartão de Débito",
      "Boleto",
      "Transferência Bancária",
      "Cheque",
      "Outros",
    ],
  },
  beneficiario: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "beneficiarioTipo",
    required: true,
  },
  beneficiarioTipo: {
    type: String,
    enum: ["Cliente", "Fornecedor", "Funcionario"],
    required: true,
  },
  documento: { type: String },
  valorPago: { type: Number, default: 0 },
  valorRecebido: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware para atualizar o updatedAt antes de salvar
TransacaoIndependenteSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const TransacaoIndependente = mongoose.model(
  "TransacaoIndependente",
  TransacaoIndependenteSchema
);

export default TransacaoIndependente;
