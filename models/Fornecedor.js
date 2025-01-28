import mongoose from "mongoose";

const FornecedorSchema = new mongoose.Schema({
  tipo: { type: String, required: true },
  tambemCliente: { type: Boolean, required: true },
  status: { type: String, required: true },
  nomeFantasia: { type: String },
  razaoSocial: { type: String },
  cnpj: { type: String },
  inscricaoEstadual: { type: String },
  inscricaoMunicipal: { type: String },
  telefone1: { type: String, required: true },
  email: { type: String, required: true },
  logradouro: { type: String, required: true },
  numero: { type: String, required: true },
  complemento: { type: String },
  bairro: { type: String, required: true },
  cidade: { type: String, required: true },
  estado: { type: String, required: true },
  cep: { type: String, required: true },
  contatos: [
    {
      nome: { type: String },
      telefone: { type: String },
      cargo: { type: String },
      email: { type: String },
    },
  ],
  informacoesComplementares: { type: String },
  documentos: { type: Array },
});

const Fornecedor = mongoose.model("Fornecedor", FornecedorSchema);

export default Fornecedor;
