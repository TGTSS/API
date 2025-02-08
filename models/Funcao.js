import mongoose from "mongoose";

const FuncaoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
});

const Funcao = mongoose.model("Funcao", FuncaoSchema);

export default Funcao;
