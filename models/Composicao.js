import mongoose from "mongoose";

const ComposicaoSchema = new mongoose.Schema({
  descricaoClasse: { type: String },
  codigoComposicao: { type: Number },
  descricaoComposicao: { type: String },
  unidade: { type: String },
  custoTotal: { type: Number },
});

// Middleware para converter custoTotal de string para número
ComposicaoSchema.pre("save", function (next) {
  if (typeof this.custoTotal === "string") {
    this.custoTotal = parseFloat(this.custoTotal);
  }
  next();
});

const Composicao = mongoose.model("Composicao", ComposicaoSchema);

export default Composicao;
