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
  completedAt: Date,
});

const projectSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  description: { type: String, required: true },
  serviceType: { type: String, required: true },
  status: {
    type: String,
    enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"],
    default: "PENDING",
  },
  location: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  startDate: { type: Date },
  deadline: { type: Date },
  budget: { type: Number, required: true },
  technicalLead: { type: String, required: true },
  clientId: { type: String, ref: "ValeClient", required: true },
  timeline: [StepSchema],
  // New fields from UI
  registry: { type: String },
  hasDeed: { type: String, enum: ["yes", "no"], default: "no" },
  area: { type: String },
  perimeter: { type: String },
});

const Project = mongoose.model("ValeProject", projectSchema);
export default Project;
