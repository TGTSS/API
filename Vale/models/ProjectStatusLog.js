import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const projectStatusLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    projectId: {
      type: String,
      ref: "ValeProject",
      required: true,
    },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    triggeredBy: {
      type: String,
      enum: ["timeline_update", "manual", "migration"],
      default: "timeline_update",
    },
    stageTitle: { type: String },
    refusalReason: { type: String },
  },
  { timestamps: true }
);

projectStatusLogSchema.index({ projectId: 1, changedAt: -1 });

const ProjectStatusLog = mongoose.model(
  "ValeProjectStatusLog",
  projectStatusLogSchema
);
export default ProjectStatusLog;
