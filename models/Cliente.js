import mongoose from "mongoose";

const contatoSchema = new mongoose.Schema({
  nome: String,
  telefone: String,
  cargo: String,
  email: String,
});

const clienteSchema = new mongoose.Schema({
  tipo: { type: String, required: true },
  tambemFornecedor: { type: Boolean, required: true },
  status: { type: String, required: true },
  nomeFantasia: String,
  razaoSocial: String,
  cnpj: String,
  inscricaoEstadual: String,
  inscricaoMunicipal: String,
  cpf: String,
  nome: String,
  telefone1: { type: String, required: true },
  email: { type: String, required: true },
  logradouro: { type: String, required: true },
  numero: { type: String, required: true },
  complemento: String,
  bairro: { type: String, required: true },
  cidade: { type: String, required: true },
  estado: { type: String, required: true },
  cep: { type: String, required: true },
  contatos: [contatoSchema],
  selectedPhone: String,
  informacoesComplementares: String,
  documentos: [String],
  segmento: String,
});

const Cliente = mongoose.model("Cliente", clienteSchema);

export default Cliente;
