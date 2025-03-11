import mongoose from "mongoose";
import Counter from "./Counter.js";

const ContatoSchema = new mongoose.Schema({
  nome: { type: String },
  telefone: { type: String },
  cargo: { type: String },
  email: { type: String },
});

const ReceitaSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    default: new mongoose.Types.ObjectId(),
  },
  vencimento: { type: String },
  valor: { type: Number },
  recebido: { type: Number },
  descricao: { type: String },
  categoria: { type: String },
  centroCusto: { type: String },
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente" },
  dataQuitacao: { type: String },
});

const PagamentoSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    default: new mongoose.Types.ObjectId(),
  },
  vencimento: { type: String },
  valor: { type: Number },
  pago: { type: Number },
  descricao: { type: String },
  categoria: { type: String },
  centroCusto: { type: String },
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente" },
  dataQuitacao: { type: String },
});

const ObraSchema = new mongoose.Schema({
  nome: { type: String },
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StatusObra",
  },
  codigo: { type: String, unique: true },
  codigoObras: { type: String },
  tipo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TipoObra",
  },
  art: { type: String },
  responsavelTecnico: { type: String },
  responsavelObra: { type: String },
  ceiCno: { type: String },
  areaConstruida: { type: Number },
  areaTerreno: { type: Number },
  numeroPavimentos: { type: Number },
  numeroUnidades: { type: Number },
  cep: { type: String },
  logradouro: { type: String },
  numero: { type: String },
  complemento: { type: String },
  bairro: { type: String },
  estado: { type: String },
  cidade: { type: String },
  quemPaga: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuemPaga",
  },
  conta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conta",
  },
  comentario: { type: String },
  visivelPara: { type: String },
  contatoPrincipal: { type: Number },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cliente",
  },
  contatos: [ContatoSchema],
  receitas: [ReceitaSchema],
  pagamentos: [PagamentoSchema],
  mapPosition: {
    type: [Number], // [latitude, longitude]
    index: "2dsphere",
  },
  etapas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Etapa" }],
  registrosDiarios: [
    { type: mongoose.Schema.Types.ObjectId, ref: "RegistroDiario" },
  ],
  galeria: [{ type: mongoose.Schema.Types.ObjectId, ref: "Galeria" }],
  documentos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Documento" }],
});

const tipoAbreviacoes = {
  "67b5b6765fec364fb905548a": "CT",
  "67b5b6805fec364fb905548c": "SO",
  "67b5b6895fec364fb905548e": "AP",
  "67b5b6945fec364fb9055491": "CR",
  "67b5b69f5fec364fb9055493": "EM",
  "67b5b6ab5fec364fb9055495": "PP",
  "67b5b6ba5fec364fb9055497": "HP",
  "67b5b6c35fec364fb9055499": "CP",
  "67b5b6d15fec364fb905549c": "LC",
  "67b5b6dc5fec364fb905549e": "SC",
  "67b5b6e75fec364fb90554a0": "SA",
  "67b5b6f15fec364fb90554a2": "EE",
  "67b5b6fd5fec364fb90554a4": "HP",
  "67b5b7065fec364fb90554a6": "RB",
  "67b5b7105fec364fb90554a9": "FA",
  "67b5b71a5fec364fb90554ab": "GI",
  "67b5b7245fec364fb90554ad": "AD",
  "67b5b72d5fec364fb90554af": "CD",
  "67b5b73b5fec364fb90554b1": "IM",
  "67b5b7465fec364fb90554b4": "RP",
  "67b5b7605fec364fb90554b6": "RO",
  "67b5b76c5fec364fb90554b8": "FE",
  "67b5b7765fec364fb90554ba": "AE",
  "67b5b7805fec364fb90554bc": "PM",
  "67b5b78c5fec364fb90554bf": "SA",
  "67b5b7965fec364fb90554c1": "HI",
  "67b5b7a15fec364fb90554c3": "EN",
  "67b5b7b05fec364fb90554c5": "TC",
  "67b5b7be5fec364fb90554c8": "RR",
  "67b5b7cc5fec364fb90554ca": "RC",
  "67b5b7d55fec364fb90554cc": "RH",
  "67b5b7de5fec364fb90554ce": "RU",
  "67b5b7e95fec364fb90554d0": "RE",
  "67b5b7f15fec364fb90554d2": "IM",
  "67b5b7fa5fec364fb90554d5": "MP",
  "67b5b82e5fec364fb90554d7": "TF",
  "67b5b83a5fec364fb90554db": "TG",
  "67b5b8995fec364fb90554df": "DE",
  "67b5b8ac5fec364fb90554e1": "PA",
  "67b5b9145fec364fb90554e7": "OS",
  "67b5b9255fec364fb90554e9": "PV",
  "67b5b9305fec364fb90554ed": "OA",
  "67b5b93b5fec364fb90554ef": "OC",
  "67b5b99c5fec364fb90554f3": "IP",
};

ObraSchema.pre("save", async function (next) {
  if (this.isNew) {
    const tipoAbreviacao = tipoAbreviacoes[this.tipo.toString()] || "OT"; // OT para "Outros"
    const counter = await Counter.findByIdAndUpdate(
      { _id: `obraId_${tipoAbreviacao}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.codigo = `${tipoAbreviacao}-${counter.seq
      .toString()
      .padStart(2, "0")}`;
  }
  next();
});

const Obra = mongoose.model("Obra", ObraSchema);

export default Obra;
