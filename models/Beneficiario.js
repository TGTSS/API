import mongoose from "mongoose";

// Definindo o esquema
const BeneficiarioSchema = new mongoose.Schema({
  name: { type: String, required: true },
  document: { type: String, required: true, unique: true }, // Adicionado unique: true
  phone: { type: String, default: "" },
  endereco: {
    rua: { type: String, default: "" },
    numero: { type: String, default: "" },
    bairro: { type: String, default: "" },
    cidade: { type: String, default: "" },
    cep: { type: String, default: "" },
    complemento: { type: String, default: "" }, // Adicionar campo complemento
  },
});

// Exportando o modelo
const Beneficiario = mongoose.model("Beneficiario", BeneficiarioSchema);

export default Beneficiario;
