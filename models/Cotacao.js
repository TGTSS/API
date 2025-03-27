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
        prazoPagamento: String, // Adicionado para armazenar prazo de pagamento do fornecedor
      },
    ],
    default: [],
  },
  numero: { type: Number, required: true, unique: true }, // Atualizado para ser obrigatório e único
  etapa: {
    nome: { type: String },
    descricao: { type: String },
  },
  pagamento: {
    prazo: { type: String },
    forma: { type: String },
    parcelas: { type: Number, default: 1 },
    metodoPagamento: { type: String },
    valorTotal: { type: Number },
    descontos: { type: Number },
  },
  entrega: {
    prazo: { type: String },
    forma: { type: String },
    endereco: {
      rua: { type: String },
      numero: { type: String },
      complemento: { type: String },
      cidade: { type: String },
      estado: { type: String },
      cep: { type: String },
    },
    rastreamento: { type: String },
    custoEntrega: { type: Number },
  },
  observacoes: {
    gerais: { type: String },
    restricoes: { type: String },
    requisitosEspeciais: { type: String },
  },
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
