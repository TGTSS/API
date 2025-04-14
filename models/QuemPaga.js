import mongoose from "mongoose";

const QuemPagaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware para atualizar o updatedAt
QuemPagaSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const QuemPaga = mongoose.model("QuemPaga", QuemPagaSchema);

export default QuemPaga;
