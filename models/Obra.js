import mongoose from "mongoose";

const ContatoSchema = new mongoose.Schema({
  nome: { type: String },
  telefone: { type: String },
  cargo: { type: String },
  email: { type: String },
});

const ObraSchema = new mongoose.Schema({
  nome: { type: String },
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StatusObra",
  },
  codigo: { type: String },
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
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cliente",
  },
  contatos: [ContatoSchema],
  mapPosition: {
    type: [Number], // [latitude, longitude]
    index: "2dsphere",
  },
});

const Obra = mongoose.model("Obra", ObraSchema);

export default Obra;
