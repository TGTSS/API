import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const AttachmentSchema = new mongoose.Schema({
  name: { type: String },
  url: { type: String },
  publicId: { type: String },
  type: { type: String },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
});

const financialTransactionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    projectId: { type: String, ref: "ValeProject", required: true },
    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"],
      required: true,
    },
    category: {
      type: String,
      required: [true, "A categoria é obrigatória"],
      trim: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    dueDate: { type: Date }, // Data de vencimento
    status: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "pending",
    },
    attachments: [AttachmentSchema],
  },
  { timestamps: true }
);

// Índices para queries frequentes
financialTransactionSchema.index({ projectId: 1 });
financialTransactionSchema.index({ type: 1 });
financialTransactionSchema.index({ date: -1 });

const FinancialTransaction = mongoose.model(
  "ValeFinancialTransaction",
  financialTransactionSchema
);
export default FinancialTransaction;
