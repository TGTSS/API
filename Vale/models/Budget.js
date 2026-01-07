import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const DynamicItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { _id: true }
);

const budgetSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    projectId: {
      type: String,
      ref: "ValeProject",
      required: [true, "O projeto é obrigatório"],
      unique: true,
    },
    tecnicoDias: { type: Number, default: 0 },
    valorDiaTecnico: { type: Number, default: 0 },
    ajudanteDias: { type: Number, default: 0 },
    valorDiaAjudante: { type: Number, default: 0 },
    gasolina: { type: Number, default: 0 },
    art: { type: Number, default: 0 },
    lavagem: { type: Number, default: 0 },
    rtkValor: { type: Number, default: 0 },
    droneValor: { type: Number, default: 0 },
    outrosEquipamentos: [DynamicItemSchema],
    projeto: { type: Number, default: 0 },
    memoria: { type: Number, default: 0 },
    outrosIndiretos: [DynamicItemSchema],
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected"],
      default: "draft",
    },
    sentForApprovalAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    clientNotes: { type: String },
    subtotalOperational: { type: Number, default: 0 },
    subtotalEquipment: { type: Number, default: 0 },
    subtotalIndirect: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

budgetSchema.pre("save", function (next) {
  const custoTecnico = (this.tecnicoDias || 0) * (this.valorDiaTecnico || 0);
  const custoAjudante = (this.ajudanteDias || 0) * (this.valorDiaAjudante || 0);
  this.subtotalOperational =
    custoTecnico +
    custoAjudante +
    (this.gasolina || 0) +
    (this.art || 0) +
    (this.lavagem || 0);

  const outrosEquipTotal = (this.outrosEquipamentos || []).reduce(
    (sum, item) => sum + (item.value || 0),
    0
  );
  this.subtotalEquipment =
    (this.rtkValor || 0) + (this.droneValor || 0) + outrosEquipTotal;

  const outrosIndiretosTotal = (this.outrosIndiretos || []).reduce(
    (sum, item) => sum + (item.value || 0),
    0
  );
  this.subtotalIndirect =
    (this.projeto || 0) + (this.memoria || 0) + outrosIndiretosTotal;

  this.total =
    this.subtotalOperational + this.subtotalEquipment + this.subtotalIndirect;

  next();
});

budgetSchema.index({ projectId: 1 });

const Budget = mongoose.model("ValeBudget", budgetSchema);
export default Budget;
