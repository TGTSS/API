import mongoose from "mongoose";

const ComposicaoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descricao: { type: String, required: true },
  unidade: { type: String, required: true },
  tipo: { type: String, required: true },
  base: { type: String, required: true },
  grupo: { type: String, required: true },
  descricaoDetalhada: { type: String },
  insumos: [
    {
      codigo: String,
      descricao: String,
      grupo: String,
      unidade: String,
      coeficiente: Number,
      custoUnitario: Number,
      custoTotal: Number,
    },
  ],
  custosUnitarios: {
    maoDeObra: Number,
    material: Number,
    equipamento: Number,
    outros: Number,
  },
});

const Composicao = mongoose.model("Composicao", ComposicaoSchema);

export default Composicao;
