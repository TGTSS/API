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

const financialTransactionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  projectId: { type: String, ref: "ValeProject", required: true },
  type: {
    type: String,
    enum: ["INCOME", "EXPENSE"],
    required: true,
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  attachments: [AttachmentSchema],
});

const FinancialTransaction = mongoose.model(
  "ValeFinancialTransaction",
  financialTransactionSchema
);
export default FinancialTransaction;
