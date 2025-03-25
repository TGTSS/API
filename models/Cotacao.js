import mongoose from "mongoose";

const CotacaoSchema = new mongoose.Schema({
  solicitacaoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Solicitacao",
    required: true,
  },
  nome: { type: String, required: true },
  descricao: { type: String, required: true },
  obraId: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
  obraNome: { type: String, required: true },
  prioridade: { type: String, required: true },
  items: {
    type: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        quantidade: Number,
        preco: Number,
      },
    ],
    required: true,
  },
  status: { type: String, default: "Em cotação" },
  data: { type: Date, default: Date.now },
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
