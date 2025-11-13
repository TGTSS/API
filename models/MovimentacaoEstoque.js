import mongoose from "mongoose";

const MovimentacaoEstoqueSchema = new mongoose.Schema(
  {
    estoque: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Estoque",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    itemCategory: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["entrada", "saida"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    responsible: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: "",
    },
    work: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const MovimentacaoEstoque = mongoose.model(
  "MovimentacaoEstoque",
  MovimentacaoEstoqueSchema
);
export default MovimentacaoEstoque;
