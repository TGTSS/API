import mongoose from "mongoose";

const SolicitacaoSchema = new mongoose.Schema({
  data: { type: Date, default: Date.now },
  status: { type: String, required: true },
  prioridade: { type: String, required: true },
  solicitante: { type: String, required: true },
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  items: [
    {
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      isManual: { type: Boolean, required: true },
    },
  ],
  obra: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
});

const Solicitacao = mongoose.model("Solicitacao", SolicitacaoSchema);

export default Solicitacao;
