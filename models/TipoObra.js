import mongoose from "mongoose";

const TipoObraSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware para atualizar o updatedAt
TipoObraSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const TipoObra = mongoose.model("TipoObra", TipoObraSchema);

export default TipoObra;
