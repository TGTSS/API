import mongoose from "mongoose";

const EstoqueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,

      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,

      required: true,
    },
    minQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    location: {
      type: String,

      required: true,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["OK", "Estoque Baixo"],
      default: "OK",
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para atualizar o status automaticamente
EstoqueSchema.pre("save", function (next) {
  if (this.quantity <= this.minQuantity) {
    this.status = "Estoque Baixo";
  } else {
    this.status = "OK";
  }
  this.lastUpdate = new Date();
  next();
});

const Estoque = mongoose.model("Estoque", EstoqueSchema);
export default Estoque;
