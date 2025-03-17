import mongoose from "mongoose";

const EtapaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  progresso: { type: Number, default: 0 },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
});

const Etapa = mongoose.model("Etapa", EtapaSchema);

export default Etapa;
