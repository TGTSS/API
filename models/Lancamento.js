import mongoose from "mongoose";

const lancamentoSchema = new mongoose.Schema(
  {
    descricao: {
      type: String,
      required: true,
    },
    valor: {
      type: Number,
      required: true,
    },
    tipo: {
      type: String,
      enum: ["receita", "despesa"],
      required: true,
    },
    data: {
      type: Date,
      required: true,
    },
    dataVencimento: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pendente", "recebido", "pago", "atrasado"],
      default: "pendente",
    },
    categoria: {
      type: String,
      required: true,
    },
    categoriaOutros: {
      type: String,
    },
    centroCusto: {
      type: String,
      required: true,
    },
    formaPagamento: {
      type: String,
      required: true,
    },
    beneficiario: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "beneficiarioTipo",
    },
    beneficiarioTipo: {
      type: String,
      enum: ["Cliente", "Fornecedor", "Funcionario"],
    },
    documento: {
      type: String,
    },
    anexos: [
      {
        type: String, // URLs dos arquivos armazenados
      },
    ],
    valorRecebido: {
      type: Number,
      default: 0,
    },
    valorPago: {
      type: Number,
      default: 0,
    },
    obra: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Obra",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Lancamento = mongoose.model("Lancamento", lancamentoSchema);

export default Lancamento;
