import mongoose from "mongoose";

const ComposicaoSchema = new mongoose.Schema({
  categoria: { type: String },
  codigoComposicao: { type: Number },
  descricaoComposicao: { type: String },
  unidade: { type: String },
  custoTotal: { type: Number },
});

// Middleware para converter custoTotal de string para número antes de salvar
ComposicaoSchema.pre("save", function (next) {
  if (typeof this.custoTotal === "string") {
    this.custoTotal = parseFloat(this.custoTotal.replace(",", "."));
  }
  next();
});

// Middleware para converter custoTotal de string para número antes de atualizar
ComposicaoSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.custoTotal && typeof update.custoTotal === "string") {
    update.custoTotal = parseFloat(update.custoTotal.replace(",", "."));
  }
  next();
});

const Composicao = mongoose.model("Composicao", ComposicaoSchema);

export default Composicao;
