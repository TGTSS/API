import mongoose from "mongoose";

const TransacaoBrutaSchema = new mongoose.Schema(
  {
    descricao: {
      type: String,
      required: true,
    },
    valor: {
      type: Number,
      required: true,
    },
    valorPago: {
      type: Number,
      default: 0,
    },
    tipo: {
      type: String,
      default: "pagamento",
    },
    data: {
      type: Date,
      default: Date.now,
    },
    dataPagamentoRecebimento: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pendente", "pago", "atrasado"],
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
    dataVencimento: {
      type: Date,
      required: true,
    },
    formaPagamento: {
      type: String,
      required: true,
    },
    beneficiario: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "beneficiarioTipo",
      required: true,
    },
    beneficiarioTipo: {
      type: String,
      enum: ["Fornecedor", "Cliente", "Funcionario"],
      required: true,
    },
    documento: {
      type: String,
    },
    associacaoOrcamento: {
      etapa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Etapa",
      },
      subetapa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subetapa",
      },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    },
    anexos: [
      {
        nome: String,
        tipo: String,
        tamanho: Number,
        caminho: String,
        dataUpload: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Campos específicos para transações brutas de NF-e
    isTransacaoBruta: {
      type: Boolean,
      default: true,
    },
    numeroParcela: {
      type: Number,
      required: true,
    },
    totalParcelas: {
      type: Number,
      required: true,
    },
    transacoesDivididas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transacao",
      },
    ],
    nfeInfo: {
      numero: String,
      serie: String,
      dataEmissao: Date,
      chaveAcesso: String,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para atualizar o updatedAt antes de salvar
TransacaoBrutaSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const TransacaoBruta = mongoose.model("TransacaoBruta", TransacaoBrutaSchema);

export default TransacaoBruta;
