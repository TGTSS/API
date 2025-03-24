import mongoose from "mongoose";

const CotacaoSchema = new mongoose.Schema({
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fornecedor",
    required: true,
  },
  itens: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
      valor: { type: Number },
      marca: { type: String },
      desconto: { type: Number },
      condicaoPagamento: { type: String },
      prazoEntrega: { type: String },
      prazoPagamento: { type: String }, // Adicionado
    },
  ],
  status: String,
});

const SolicitacaoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String, required: true },
  data: { type: Date, default: Date.now },
  status: { type: String, required: true },
  prioridade: { type: String, required: true },
  solicitante: { type: String, required: true },
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
  obraNome: { type: String, required: true },
  numeroSequencial: { type: Number, required: true },
  fornecedores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Fornecedor" }],
  cotacoes: [CotacaoSchema],
});

const Solicitacao = mongoose.model("Solicitacao", SolicitacaoSchema);

export default Solicitacao;
