import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const teamMemberSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    role: { type: String, required: true }, // Job title, e.g. "Topógrafo"
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    type: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    avatar: { type: String },
  },
  { timestamps: true }
);

const TeamMember = mongoose.model("ValeTeamMember", teamMemberSchema);
export default TeamMember;
