import mongoose from "mongoose";

const enderecoSchema = new mongoose.Schema({
  logradouro: String,
  numero: String,
  complemento: String,
  bairro: String,
  cidade: String,
  uf: String,
  cep: String,
  pais: String,
  fone: String,
});

const impostosSchema = new mongoose.Schema({
  icms: {
    baseCalculo: String,
    aliquota: String,
    valor: String,
    cst: String,
  },
  pis: {
    baseCalculo: String,
    aliquota: String,
    valor: String,
    cst: String,
  },
  cofins: {
    baseCalculo: String,
    aliquota: String,
    valor: String,
    cst: String,
  },
});

const produtoSchema = new mongoose.Schema({
  codigo: String,
  descricao: String,
  ncm: String,
  cfop: String,
  quantidade: String,
  unidade: String,
  valorUnitario: String,
  valorTotal: String,
  impostos: impostosSchema,
});

const totaisSchema = new mongoose.Schema({
  valorProdutos: String,
  valorFrete: String,
  valorSeguro: String,
  valorDesconto: String,
  valorII: String,
  valorIPI: String,
  valorPIS: String,
  valorCOFINS: String,
  valorNF: String,
  baseCalculoICMS: String,
  valorICMS: String,
});

const faturaSchema = new mongoose.Schema({
  numero: String,
  valorOriginal: String,
  valorDesconto: String,
  valorLiquido: String,
});

const duplicataSchema = new mongoose.Schema({
  numero: String,
  vencimento: String,
  valor: String,
});

const protocoloSchema = new mongoose.Schema({
  numero: String,
  dataAutorizacao: String,
  status: String,
  mensagem: String,
});

const nfeRecentesSchema = new mongoose.Schema(
  {
    // Dados da consulta
    certificadoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificado",
      required: true,
    },
    dataConsulta: {
      type: Date,
      default: Date.now,
    },

    // Dados da NFe
    chaveAcesso: {
      type: String,
      required: true,
      unique: true,
    },
    numero: String,
    serie: String,
    model: String,
    tipoEmissao: String,
    finalidade: String,
    naturezaOperacao: String,
    dataEmissao: String,
    dataSaida: String,
    tipoOperacao: String,
    status: {
      type: String,
      enum: ["authorized", "cancelled", "pending", "1", "2", "3"],
      default: "pending",
    },
    xmlContent: String,

    protocolo: protocoloSchema,

    issuer: {
      nome: String,
      cnpj: String,
      ie: String,
      endereco: enderecoSchema,
    },

    recipient: {
      nome: String,
      cnpj: String,
      ie: String,
      endereco: enderecoSchema,
    },

    value: Number,
    produtos: [produtoSchema],
    totais: totaisSchema,
    fatura: faturaSchema,
    duplicatas: [duplicataSchema],

    // Dados do NSU
    nsu: String,
    schema: String,

    // Metadados
    processado: {
      type: Boolean,
      default: false,
    },
    observacoes: String,
  },
  { timestamps: true }
);

// Índices para melhorar a performance das consultas
nfeRecentesSchema.index({ certificadoId: 1 });
nfeRecentesSchema.index({ dataConsulta: 1 });
nfeRecentesSchema.index({ status: 1 });
nfeRecentesSchema.index({ "issuer.cnpj": 1 });
nfeRecentesSchema.index({ "recipient.cnpj": 1 });
nfeRecentesSchema.index({ nsu: 1 });

const NFeRecentes = mongoose.model("NFeRecentes", nfeRecentesSchema);

export default NFeRecentes;
