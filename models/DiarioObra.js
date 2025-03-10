import mongoose from "mongoose";

const DiarioObraSchema = new mongoose.Schema({
  obraSelecionada: { type: String, required: true },
  tipoObra: { type: String, required: true },
  statusObra: { type: String, required: true },
  enderecoObra: {
    logradouro: { type: String, required: true },
    numero: { type: String, required: true },
    bairro: { type: String, required: true },
    cidade: { type: String, required: true },
    estado: { type: String, required: true },
  },
  dataInicio: { type: Date, required: true },
  dataPrevisao: { type: Date, required: true },
  descricao: { type: String },
  engenheiro: { type: String, required: true },
  mestre: { type: String },
  arquiteto: { type: String },
  imagem: { type: String },
});

const DiarioObra = mongoose.model("DiarioObra", DiarioObraSchema);

export default DiarioObra;
