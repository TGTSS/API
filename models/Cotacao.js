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
        _id: mongoose.Schema.Types.ObjectId,
        description: String,
        quantity: Number,
        unitPrice: Number,
      },
    ],
  },
  fornecedores: {
    type: [
      {
        fornecedorId: mongoose.Schema.Types.ObjectId,
        nome: String,
        telefone: String,
      },
    ],
    default: [],
  },
  valor: { type: Number, default: 0 }, // Adicionado para armazenar o valor total da cotação
  status: { type: String, default: "Em cotação" },
  data: { type: Date, default: Date.now },
  itensFornecedor: {
    type: [
      {
        fornecedorId: mongoose.Schema.Types.ObjectId,
        itens: [
          {
            itemId: mongoose.Schema.Types.ObjectId,
            valor: Number,
            marca: String,
            desconto: Number,
            condicaoPagamento: String,
            prazoEntrega: String,
            prazoPagamento: String, // Adicionado para armazenar o prazo de pagamento
          },
        ],
      },
    ],
    default: [],
  },
  numero: { type: String, required: true }, // Adicionado para identificar a cotação
  etapa: {
    nome: { type: String },
    descricao: { type: String },
  }, // Adicionado para armazenar informações da etapa
});

const Cotacao = mongoose.model("Cotacao", CotacaoSchema);

export default Cotacao;
