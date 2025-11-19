import mongoose from "mongoose";

const CategoriaSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware para atualizar o updatedAt
CategoriaSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Categoria = mongoose.model("Categoria", CategoriaSchema);

export default Categoria;
