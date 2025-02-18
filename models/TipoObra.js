import mongoose from "mongoose";

const TipoObraSchema = new mongoose.Schema({
  nome: { type: String, required: true },
});

const TipoObra = mongoose.model("TipoObra", TipoObraSchema);

export default TipoObra;
