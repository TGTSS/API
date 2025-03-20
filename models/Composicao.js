import mongoose from "mongoose";

const ComposicaoSchema = new mongoose.Schema({
  categoria: { type: String, required: true },
  codigoComposicao: { type: Number, required: true },
  descricaoComposicao: { type: String, required: true },
  unidade: { type: String, required: true },
  custoTotal: { type: Number, required: true },
});

const Composicao = mongoose.model("Composicao", ComposicaoSchema);

export default Composicao;
