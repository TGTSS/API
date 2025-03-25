import mongoose from "mongoose";

const CotacaoSchema = new mongoose.Schema({
  solicitacaoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Solicitacao",
  },
  nome: { type: String },
  descricao: { type: String },
  obraId: { type: mongoose.Schema.Types.ObjectId, ref: "Obra" },
  obraNome: { type: String },
  prioridade: { type: String },
  items: {
    type: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        quantidade: Number,
        preco: Number,
      },
    ],
  },
  status: { type: String, default: "Em cotação" },
  data: { type: Date, default: Date.now },
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
