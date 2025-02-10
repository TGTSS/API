import mongoose from "mongoose";

const InsumoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descricao: { type: String, required: true },
  tipo: { type: String, required: true },
  unidade: { type: String, required: true },
  grupo: { type: String, required: true },
  base: { type: String, required: true },
  custo: { type: Number, required: true },
  status: { type: String, required: true },
  observacoes: { type: String },
  arquivos: { type: String },
});

const Insumo = mongoose.model("Insumo", InsumoSchema);

export default Insumo;
