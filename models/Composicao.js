import mongoose from "mongoose";

const ComposicaoSchema = new mongoose.Schema({
  descricaoClasse: { type: String },
  codigoComposicao: { type: String },
  descricaoComposicao: { type: String },
  unidade: { type: String },
  custoTotal: { type: Number },
});

const Composicao = mongoose.model("Composicao", ComposicaoSchema);

export default Composicao;
