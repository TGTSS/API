import mongoose from "mongoose";

const RegistroDiarioSchema = new mongoose.Schema({
  data: { type: Date, required: true },
  titulo: { type: String, required: true },
  descricao: { type: String, required: true },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
  fotos: [{ type: String }],
  clima: { type: String, required: true },
  etapasAtualizadas: [{ nome: String, status: String }],
});

const RegistroDiario = mongoose.model("RegistroDiario", RegistroDiarioSchema);

export default RegistroDiario;
