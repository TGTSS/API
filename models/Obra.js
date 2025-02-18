import mongoose from "mongoose";

const ContatoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  telefone: { type: String, required: true },
  cargo: { type: String, required: true },
  email: { type: String, required: true },
});

const ObraSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StatusObra",
    required: true,
  },
  codigo: { type: String, required: true },
  tipo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TipoObra",
    required: true,
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
  endereco: { type: String },
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
    required: true,
  },
  contatos: [ContatoSchema],
});

const Obra = mongoose.model("Obra", ObraSchema);

export default Obra;
