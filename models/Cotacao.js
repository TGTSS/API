import mongoose from "mongoose";

const CotacaoSchema = new mongoose.Schema({
  solicitacaoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Solicitacao",
  },
  nome: { type: String },
  descricao: { type: String },
  obraId: { type: mongoose.Schema.Types.ObjectId, ref: "Obra" },
  obraNome: { type: String },
  prioridade: { type: String },
  itens: {
    type: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        descricao: String, // Atualizado para "descricao"
        quantidade: Number, // Atualizado para "quantidade"
        valor: Number, // Atualizado para "valor"
      },
    ],
    default: [],
  },
  fornecedores: {
    type: [
      {
        fornecedorId: mongoose.Schema.Types.ObjectId,
        nome: String,
        telefone: String,
      },
    ],
    default: [],
  },
  valor: { type: Number, default: 0 },
  status: { type: String, default: "Em cotação" },
  data: { type: Date, default: Date.now },
  itensFornecedor: {
    type: [
      {
        fornecedorId: mongoose.Schema.Types.ObjectId,
        itens: [
          {
            itemId: mongoose.Schema.Types.ObjectId,
            valor: Number,
            marca: String,
            desconto: Number,
            condicaoPagamento: String,
            prazoEntrega: String,
            prazoPagamento: String,
          },
        ],
      },
    ],
    default: [],
  },
  numero: { type: String },
  etapa: {
    nome: { type: String },
    descricao: { type: String },
  },
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
