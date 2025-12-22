import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["ADMIN", "ENGINEER", "CLIENT"],
    default: "ENGINEER",
  },
  avatar: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Hide password in toJSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("ValeUser", userSchema);
export default User;
