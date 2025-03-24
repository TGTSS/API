import mongoose from "mongoose";

const CotacaoSchema = new mongoose.Schema({
  items: [
    {
      description: String,
      quantity: Number,
      unitPrice: Number,
    },
  ],
  status: {
    type: String,
    enum: ["Em cotação", "Aprovado", "Recusado"],
    default: "Em cotação",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
