import mongoose from "mongoose";

const EtapaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
  dataInicio: { type: Date },
  dataFim: { type: Date },
});

const Etapa = mongoose.model("Etapa", EtapaSchema);

export default Etapa;
