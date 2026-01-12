import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["ADMIN", "ENGINEER", "CLIENT", "CARTORIO"],
    default: "ENGINEER",
    index: true,
  },
  clients: [{ type: String, ref: "ValeClient" }],
  avatar: { type: String },
  avatarPublicId: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Índice composto para otimizar consultas de login
userSchema.index({ email: 1, password: 1 });

// Hide password in toJSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("ValeUser", userSchema);
export default User;
