import mongoose from "mongoose";

const FornecedorSchema = new mongoose.Schema({
  tipo: { type: String },
  tambemCliente: { type: Boolean },
  status: { type: String },
  nomeFantasia: { type: String, required: true },
  razaoSocial: { type: String },
  cnpj: { type: String, required: true },
  inscricaoEstadual: { type: String },
  inscricaoMunicipal: { type: String },
  telefone1: { type: String },
  email: { type: String },
  logradouro: { type: String },
  numero: { type: String },
  complemento: { type: String },
  bairro: { type: String },
  cidade: { type: String },
  estado: { type: String },
  cep: { type: String },
  contatos: [
    {
      nome: { type: String },
      telefone: { type: String },
      cargo: { type: String },
      email: { type: String },
    },
  ],
  informacoesComplementares: { type: String },
  documentos: [{ type: String }],
});

const Fornecedor = mongoose.model("Fornecedor", FornecedorSchema);

export default Fornecedor;
