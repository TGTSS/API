import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const inviteSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  code: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  clientId: { type: String, ref: "Client", required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});

const Invite = mongoose.model("Invite", inviteSchema);
export default Invite;
