import mongoose from "mongoose";

const RegistroDiarioSchema = new mongoose.Schema({
  data: { type: Date, required: true },
  descricao: { type: String, required: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
  fotos: [{ type: String }],
});

const RegistroDiario = mongoose.model("RegistroDiario", RegistroDiarioSchema);

export default RegistroDiario;
