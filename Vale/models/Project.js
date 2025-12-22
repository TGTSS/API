import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const projectSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 }, // PRJ-2024-001 format logic might need to be in controller or pre-save. The schema says 'id: UUID'. Use String for now.
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
  budget: { type: Number, required: true }, // Decimal in schema, Number in Mongoose usually fine for simple cases, or Decimal128
  technicalLead: { type: String, required: true },
  clientId: { type: String, ref: "ValeClient", required: true },
});

const Project = mongoose.model("ValeProject", projectSchema);
export default Project;
