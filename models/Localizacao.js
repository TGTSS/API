import mongoose from "mongoose";

const LocalizacaoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware para atualizar o updatedAt
LocalizacaoSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Localizacao = mongoose.model("Localizacao", LocalizacaoSchema);

export default Localizacao;
