import mongoose from "mongoose";

const unitSchema = new mongoose.Schema({
  unidade: { type: String, required: true, unique: true },
});

const Unit = mongoose.model("Unit", unitSchema);

export default Unit;
