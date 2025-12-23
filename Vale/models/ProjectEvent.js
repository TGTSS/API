import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const projectEventSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  projectId: { type: String, ref: "ValeProject", required: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  time: { type: String },
  location: { type: String },
  type: {
    type: String,
    enum: ["field", "meeting", "deadline", "office", "other"],
    default: "field",
  },
  description: { type: String },
});

const ProjectEvent = mongoose.model("ValeProjectEvent", projectEventSchema);
export default ProjectEvent;
