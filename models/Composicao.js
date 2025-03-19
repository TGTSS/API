import mongoose from "mongoose";

const ComposicaoSchema = new mongoose.Schema({
  categoria: { type: String },
  codigoComposicao: { type: Number },
  descricaoComposicao: { type: String },
  unidade: { type: String },
  custoTotal: { type: String },
});


const Composicao = mongoose.model("Composicao", ComposicaoSchema);

export default Composicao;
