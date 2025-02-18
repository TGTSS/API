import mongoose from "mongoose";

const ContaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
});

const Conta = mongoose.model("Conta", ContaSchema);

export default Conta;
