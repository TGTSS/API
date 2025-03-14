import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  id: Number,
  number: String,
  description: String,
  quantity: Number,
  unitPrice: Number,
  total: Number,
  category: String,
  status: String,
  custoTotal: Number,
  precoUnitario: Number,
  precoTotal: Number,
});

const SubStageSchema = new mongoose.Schema({
  id: Number,
  number: String,
  name: String,
  items: [ItemSchema],
});

const StageSchema = new mongoose.Schema({
  id: Number,
  number: String,
  title: String,
  progress: Number,
  status: String,
  color: String,
  totalCost: Number,
  bdi: Number,
  subStages: [SubStageSchema],
  items: [ItemSchema],
});

const OrcamentoSchema = new mongoose.Schema({
  obraId: String,
  stages: [StageSchema],
  globalBdi: Number,
  dataCriacao: Date,
  dataAtualizacao: Date,
});

const Orcamento = mongoose.model("Orcamento", OrcamentoSchema);

export default Orcamento;
