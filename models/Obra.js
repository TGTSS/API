import mongoose from "mongoose";
import Counter from "./Counter.js";

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

const tipoAbreviacoes = {
  "Casa térrea": "CT",
  Sobrado: "SO",
  Apartamento: "AP",
  "Condomínio residencial": "CR",
  "Edifício multifamiliar": "EM",
  "Prédio de alto padrão": "PP",
  "Habitação popular": "HP",
  "Construção própria": "CP",
  "Lojas e estabelecimentos comerciais": "LC",
  "Shopping centers": "SC",
  "Supermercados e atacadistas": "SA",
  "Escritórios e centros empresariais": "EE",
  "Hotéis e pousadas": "HP",
  "Restaurantes e bares": "RB",
  Fábricas: "FA",
  "Galpões industriais": "GI",
  "Armazéns e depósitos": "AD",
  "Centros de distribuição": "CD",
  "Instalações metalúrgicas": "IM",
  "Refinarias de petróleo e gás": "RP",
  Rodoviária: "RO",
  Ferroviária: "FE",
  Aeroportuária: "AE",
  "Portuária e marítima": "PM",
  Saneamento: "SA",
  Hidráulica: "HI",
  Energética: "EN",
  Telecomunicações: "TC",
  "Reforma residencial": "RR",
  "Reforma comercial": "RC",
  "Restauração de patrimônio histórico": "RH",
  "Revitalização urbana": "RU",
  "Reforço estrutural": "RE",
  Impermeabilização: "IM",
  "Manutenção predial": "MP",
  "Troca de fachadas e revestimentos": "TF",
  "Topografia e geotecnia": "TG",
  Demolição: "DE",
  Pavimentação: "PA",
  "Obras subterrâneas": "OS",
  Paisagismo: "PV",
  "Obras de acessibilidade": "OA",
  "Obras acústicas": "OC",
  "Iluminação pública": "IP",
};

ObraSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "obraId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const tipoAbreviacao = tipoAbreviacoes[this.tipo] || "OT"; // OT para "Outros"
    this.codigo = `${tipoAbreviacao}-${counter.seq
      .toString()
      .padStart(2, "0")}`;
  }
  next();
});

const Obra = mongoose.model("Obra", ObraSchema);

export default Obra;
