import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const StepSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending",
  },
  assignedTo: { type: String, ref: "ValeTeamMember" },
  completedAt: Date,
});

const projectSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: [true, "O nome do projeto é obrigatório"] },
    description: {
      type: String,
      required: [true, "A descrição do projeto é obrigatória"],
    },
    serviceType: {
      type: String,
      required: [true, "O tipo de serviço é obrigatório"],
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"],
      default: "PENDING",
    },
    location: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    startDate: { type: Date },
    deadline: { type: Date },
    deliveryDays: { type: Number },
    budget: { type: Number, required: [true, "O orçamento é obrigatório"] },
    technicalLead: [{ type: String, ref: "ValeTeamMember" }],
    clientId: {
      type: String,
      ref: "ValeClient",
      required: [true, "O cliente é obrigatório"],
    },
    timeline: [StepSchema],
    registry: { type: String },
    hasDeed: { type: String, enum: ["yes", "no"], default: "no" },
    area: { type: String },
    perimeter: { type: String },
    code: { type: String, unique: true },
    imagem: { type: String },
    imagemPublicId: { type: String },
    documents: [
      {
        name: String,
        url: String,
        publicId: String,
        type: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Project = mongoose.model("ValeProject", projectSchema);
export default Project;
