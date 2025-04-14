import mongoose from "mongoose";

const TransacaoIndependenteSchema = new mongoose.Schema({
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  tipo: { type: String, enum: ["receita", "pagamento"], required: true },
  data: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pendente", "concluido"],
    default: "pendente",
  },
  categoria: { type: String, default: "Outros" },
});

const TransacaoIndependente = mongoose.model(
  "TransacaoIndependente",
  TransacaoIndependenteSchema
);

export default TransacaoIndependente;
