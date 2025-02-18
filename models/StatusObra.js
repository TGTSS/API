import mongoose from "mongoose";

const StatusObraSchema = new mongoose.Schema({
  nome: { type: String, required: true },
});

const StatusObra = mongoose.model("StatusObra", StatusObraSchema);

export default StatusObra;
