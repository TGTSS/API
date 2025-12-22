import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const clientSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  document: { type: String, required: true }, // CPF/CNPJ
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  userId: { type: String, ref: "ValeUser" }, // Link to User if they have access
  projects: [{ type: String, ref: "ValeProject" }], // Relationship
});

const Client = mongoose.model("ValeClient", clientSchema);
export default Client;
