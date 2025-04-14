import mongoose from "mongoose";

const medicaoSchema = new mongoose.Schema({
  obraId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Obra",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  responsavel: {
    type: String,
  },
  totalMedido: {
    type: Number,
    default: 0,
  },
  progressoGeral: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["Aprovado", "Em revisão", "Pendente"],
    default: "Pendente",
  },
  groups: [
    {
      id: {
        type: String,
      },
      title: {
        type: String,
      },
      items: [
        {
          id: {
            type: String,
          },
          description: {
            type: String,
          },
          unit: {
            type: String,
          },
          plannedQuantity: {
            type: Number,
          },
          value: {
            type: Number,
          },
          executedQuantity: {
            type: Number,
            default: 0,
          },
          executedValue: {
            type: Number,
            default: 0,
          },
          percentage: {
            type: Number,
            default: 0,
          },
          status: {
            type: String,
            enum: ["Aprovado", "Em revisão", "Pendente"],
            default: "Pendente",
          },
          history: [
            {
              date: {
                type: Date,
                default: Date.now,
              },
              quantity: {
                type: Number,
              },
              value: {
                type: Number,
              },
              percentage: {
                type: Number,
              },
              status: {
                type: String,
                enum: ["Aprovado", "Em revisão", "Pendente"],
              },
              comments: {
                type: String,
              },
              responsavel: {
                type: String,
              },
            },
          ],
          attachments: [
            {
              name: {
                type: String,
              },
              url: {
                type: String,
              },
              type: {
                type: String,
              },
              size: {
                type: Number,
              },
              uploadedAt: {
                type: Date,
                default: Date.now,
              },
            },
          ],
        },
      ],
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

// Middleware para atualizar o campo updatedAt
medicaoSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Medicao = mongoose.model("Medicao", medicaoSchema);

export default Medicao;
