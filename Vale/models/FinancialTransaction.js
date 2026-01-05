import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

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
  attachments: [
    {
      name: String,
      url: String,
      publicId: String,
      type: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
});

const FinancialTransaction = mongoose.model(
  "ValeFinancialTransaction",
  financialTransactionSchema
);
export default FinancialTransaction;
