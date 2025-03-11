import mongoose from "mongoose";

const GaleriaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  descricao: { type: String },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
});

const Galeria = mongoose.model("Galeria", GaleriaSchema);

export default Galeria;
