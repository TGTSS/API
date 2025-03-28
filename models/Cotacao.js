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
        descricao: { type: String, required: true },
        quantidade: { type: Number, required: true, min: 1 },
        unidade: { type: String, required: true },
        valor: { type: Number, required: true, min: 0 },
      },
    ],
    default: [],
  },
  arquivos: {
    type: [
      {
        nome: { type: String, required: true },
        descricao: { type: String },
        caminho: { type: String, required: true }, // Caminho do arquivo no servidor
        tamanho: { type: Number },
      },
    ],
    default: [],
  },
  fornecedores: {
    type: [
      {
        fornecedorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Fornecedor",
        },
        itens: [
          {
            itemId: { type: mongoose.Schema.Types.ObjectId },
            valor: { type: Number },
            marca: { type: String },
            desconto: { type: Number },
            condicaoPagamento: { type: String },
            prazoEntrega: { type: String },
            prazoPagamento: { type: String },
            obra: { type: String }, // Adicionado para armazenar informações da obra
          },
        ],
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
    prazo: { type: String, required: true },
    forma: { type: String, required: true },
    parcelas: { type: Number, default: 1, min: 1, required: true },
    metodoPagamento: { type: String, required: true },
    valorTotal: { type: Number },
    descontos: { type: Number },
  },
  entrega: {
    prazo: { type: String, required: true },
    forma: { type: String, required: true },
    endereco: {
      rua: { type: String, required: true },
      numero: { type: String, required: true },
      complemento: { type: String },
      cidade: { type: String, required: true },
      estado: { type: String, required: true },
      cep: { type: String, required: true, match: /^\d{5}-?\d{3}$/ },
    },
    rastreamento: { type: String },
    custoEntrega: { type: Number, min: 0 },
  },
  observacoes: {
    gerais: { type: String },
    restricoes: { type: String },
    requisitosEspeciais: { type: String },
  },
  progresso: {
    informacoes: { type: Boolean, default: false },
    itens: { type: Boolean, default: false },
    fornecedores: { type: Boolean, default: false },
    custos: { type: Boolean, default: false },
    arquivos: { type: Boolean, default: false },
  },
  ordensCompra: {
    type: [
      {
        fornecedorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Fornecedor",
        },
        itens: [
          {
            itemId: { type: mongoose.Schema.Types.ObjectId },
            descricao: { type: String },
            quantidade: { type: Number },
            valor: { type: Number },
            valorTotal: { type: Number },
            unidade: { type: String },
          },
        ],
        total: { type: Number },
        fornecedor: {
          nome: { type: String },
          cnpj: { type: String },
          telefone: { type: String },
          email: { type: String },
        },
      },
    ],
    default: [],
  },
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
