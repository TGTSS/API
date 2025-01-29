import mongoose from "mongoose";

const FuncionarioSchema = new mongoose.Schema({
  status: { type: String },
  nome: { type: String },
  cpf: { type: String, unique: true },
  telefone1: { type: String },
  telefone2: { type: String },
  email: { type: String },
  dataNascimento: { type: Date },
  cargo: { type: String },
  salario: { type: Number },
  logradouro: { type: String },
  numero: { type: String },
  complemento: { type: String },
  bairro: { type: String },
  cidade: { type: String },
  estado: { type: String },
  cep: { type: String },
  informacoesComplementares: { type: String },
  nomePai: { type: String },
  nomeMae: { type: String },
  estadoCivil: { type: String },
  quantidadeFilhos: { type: Number },
  documentos: { type: [String] },
});

const Funcionario = mongoose.model("Funcionario", FuncionarioSchema);

export default Funcionario;
