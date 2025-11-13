import mongoose from "mongoose";
const HistoricoValorSchema = new mongoose.Schema({
  data: { type: Date, default: Date.now },
  valor: { type: Number, required: true },
  origem: { type: String }, // Ex: "Entrada de Estoque", "Cadastro Manual"
});

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

  // novos campos para histórico de valores
  ultimaAtualizacao: { type: Date, default: Date.now },
  historicoValores: { type: [HistoricoValorSchema], default: [] },
});

const Insumo = mongoose.model("Insumo", InsumoSchema);

export default Insumo;
