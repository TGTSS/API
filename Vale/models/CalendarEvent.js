import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const calendarEventSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    time: { type: String },
    location: { type: String },
    type: {
      type: String,
      enum: ["field", "meeting", "deadline", "office", "other"],
      default: "field",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "canceled"],
      default: "pending",
    },
    assignedTo: { type: String, ref: "ValeTeamMember" },
    projectId: { type: String, ref: "ValeProject" },
    stageId: { type: String }, 
    createdBy: { type: String, ref: "ValeUser" },
  },
  { timestamps: true }
);

const CalendarEvent = mongoose.model("ValeCalendarEvent", calendarEventSchema);
export default CalendarEvent;
