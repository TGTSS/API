import mongoose from "mongoose";

const DocumentoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  arquivo: {
    nome: { type: String, required: true },
    tipo: { type: String, required: true },
    tamanho: { type: Number, required: true },
    caminho: { type: String, required: true },
  },
  obra: { type: mongoose.Schema.Types.ObjectId, ref: "Obra", required: true },
  dataUpload: { type: Date, default: Date.now },
});

const Documento = mongoose.model("Documento", DocumentoSchema);

export default Documento;
