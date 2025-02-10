import mongoose from "mongoose";

const InsumoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descricao: { type: String },
  tipo: { type: String },
  unidade: { type: String },
  grupo: { type: String },
  base: { type: String },
  custo: { type: Number },
  status: { type: String },
  observacoes: { type: String },
  arquivos: { type: String },
});

const Insumo = mongoose.model("Insumo", InsumoSchema);

export default Insumo;
