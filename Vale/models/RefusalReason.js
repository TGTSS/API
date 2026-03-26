import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const refusalReasonSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    label: {
      type: String,
      required: [true, "O motivo de recusa é obrigatório"],
      trim: true,
      unique: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

refusalReasonSchema.index({ active: 1 });

const RefusalReason = mongoose.model("ValeRefusalReason", refusalReasonSchema);
export default RefusalReason;
