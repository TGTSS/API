import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const projectEventSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  projectId: { type: String, ref: "Project", required: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  completed: { type: Boolean, default: false },
});

const ProjectEvent = mongoose.model("ProjectEvent", projectEventSchema);
export default ProjectEvent;
