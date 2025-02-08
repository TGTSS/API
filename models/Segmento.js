import mongoose from "mongoose";

const segmentoSchema = new mongoose.Schema({
  nome: {
    type: String,
  },
});

const Segmento = mongoose.model("Segmento", segmentoSchema);

export default Segmento;
