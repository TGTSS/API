import mongoose from "mongoose";

const FormaRemuneracaoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
});

const FormaRemuneracao = mongoose.model("FormaRemuneracao", FormaRemuneracaoSchema);

export default FormaRemuneracao;
