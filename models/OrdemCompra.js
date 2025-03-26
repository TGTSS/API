import mongoose from "mongoose";

const OrdemCompraSchema = new mongoose.Schema({
  cotacaoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cotacao",
    required: true,
  },
  fornecedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fornecedor",
    required: true,
  },
  itens: {
    type: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        descricao: String,
        quantidade: Number,
        valor: Number,
      },
    ],
    required: true,
  },
  total: { type: Number, required: true },
  status: { type: String, default: "pendente" },
  dataCriacao: { type: Date, default: Date.now },
  obra: { type: String, default: "Não especificada" },
  numero: { type: Number, required: true, unique: true }, // Adicionado
  data: { type: Date, default: Date.now }, // Adicionado
  valorTotal: { type: Number, required: true }, // Adicionado
  formaPagamento: { type: String, default: "Não especificada" },
  prazoPagamento: { type: String, default: "Não especificado" },
  condicoesPagamento: { type: String, default: "Não especificadas" },
  responsavel: { type: String, default: "Não especificado" },
  solicitante: { type: String, default: "Não especificado" },
  centroCusto: { type: String, default: "Não especificado" },
  departamento: { type: String, default: "Não especificado" },
  prioridade: { type: String, default: "normal" },
  tipoEntrega: { type: String, default: "normal" },
  localEntrega: { type: String, default: "Não especificado" },
  observacoesEntrega: { type: String, default: "" },
  observacoesPagamento: { type: String, default: "" },
  observacoesGerais: { type: String, default: "" },
});

const OrdemCompra = mongoose.model("OrdemCompra", OrdemCompraSchema);

export default OrdemCompra;
