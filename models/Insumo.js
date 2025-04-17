import mongoose from "mongoose";

const InsumoSchema = new mongoose.Schema({
  codigo: { type: String },
  descricao: { type: String },
  tipo: { type: String },
  unidade: { type: String },
  grupo: { type: String },
  base: { type: String, default: "Própria" },
  custo: { type: Number },
  salario: { type: Number },
  encargos: { type: Number },
  beneficios: { type: Number },
  total: { type: Number },
  status: { type: String, default: "Ativo" },
  observacoes: { type: String },
  arquivos: { type: String },
});

const Insumo = mongoose.model("Insumo", InsumoSchema);

export default Insumo;
