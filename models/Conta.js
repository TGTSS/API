import mongoose from "mongoose";

const ContaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  numero: { type: String, required: true },
  agencia: { type: String },
  banco: { type: String },
  tipo: {
    type: String,
    enum: ["corrente", "poupanca", "investimento", "outros"],
    default: "corrente",
  },
  saldo: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Middleware para atualizar o updatedAt
ContaSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Conta = mongoose.model("Conta", ContaSchema);

export default Conta;
