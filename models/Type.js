import mongoose from "mongoose";

const typeSchema = new mongoose.Schema({
  tipo: { type: String, required: true, unique: true },
});

const Type = mongoose.model("Type", typeSchema);

export default Type;
