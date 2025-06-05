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

const nfeSchema = new mongoose.Schema(
  {
    chaveAcesso: String,
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
      enum: ["authorized", "cancelled", "pending"],
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
  },
  { timestamps: true }
);

// Índices para melhorar a performance das consultas
nfeSchema.index({ chaveAcesso: 1 }, { unique: true });
nfeSchema.index({ numero: 1 });
nfeSchema.index({ "issuer.cnpj": 1 });
nfeSchema.index({ "recipient.cnpj": 1 });
nfeSchema.index({ status: 1 });
nfeSchema.index({ dataEmissao: 1 });

const NFe = mongoose.model("NFe", nfeSchema);

export default NFe;
