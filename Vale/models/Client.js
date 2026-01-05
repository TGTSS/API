import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const clientSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  document: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  address: { type: String },

  // New fields from UI
  contactName: { type: String },
  notes: { type: String },

  userId: { type: String, ref: "ValeUser" },
  projects: [{ type: String, ref: "ValeProject" }],
  status: {
    type: String,
    default: "active",
    enum: ["active", "invited", "blocked"],
  },
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
});

const Client = mongoose.model("ValeClient", clientSchema);
export default Client;
