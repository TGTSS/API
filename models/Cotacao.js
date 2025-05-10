import mongoose from "mongoose";

const ArquivoSchema = new mongoose.Schema({
  nome: { type: String },
  descricao: { type: String },
  caminho: { type: String },
  tamanho: { type: Number },
});

const CotacaoSchema = new mongoose.Schema({
  solicitacaoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Solicitacao",
    required: true,
  },
  nome: {
    type: String,
    required: true,
  },
  descricao: { type: String },
  obraId: { type: mongoose.Schema.Types.ObjectId, ref: "Obra" },
  obraNome: { type: String },
  prioridade: { type: String },
  itens: {
    type: [
      {
        descricao: { type: String },
        quantidade: { type: Number, min: 1 },
        unidade: { type: String, default: "UN" },
        valor: { type: Number, min: 0 },
        itemId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],
    default: [],
  },
  arquivos: {
    type: [ArquivoSchema],
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
            obra: { type: String },
          },
        ],
        desconto: {
          value: { type: Number, default: 0 },
          type: {
            type: String,
            enum: ["percentage", "fixed"],
            default: "percentage",
          },
        },
      },
    ],
    default: [],
  },
  valor: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      "Pendente",
      "Em cotação",
      "Enviada para fornecedores",
      "Aprovada",
      "Recusada",
    ],
    default: "Pendente",
  },
  data: { type: Date, default: Date.now },
  dataCotacao: { type: Date, default: Date.now },
  dataSolicitacao: { type: Date },
  dataAprovacao: { type: Date },
  dataRecusa: { type: Date },
  aprovadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  recusadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  motivoRecusa: { type: String },
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
        prazoPagamento: String,
      },
    ],
    default: [],
  },
  numero: { type: Number, unique: true },
  etapa: {
    nome: { type: String },
    descricao: { type: String },
  },
  pagamento: {
    parcelas: { type: Number, default: 1, min: 1 },
    valorTotal: { type: Number, default: 0 },
    formaPagamento: { type: String, default: "" },
    condicaoPagamento: { type: String, default: "" },
    descontos: { type: Number, default: 0 },
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
      cep: { type: String, match: /^\d{5}-?\d{3}$/ },
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
  historico: {
    type: [
      {
        data: { type: Date, default: Date.now },
        status: { type: String },
        observacao: { type: String },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    default: [],
  },
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
