import mongoose from "mongoose";

const FuncionarioSchema = new mongoose.Schema({
  status: { type: String, required: true },
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  telefone1: { type: String, required: true },
  telefone2: { type: String },
  email: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  cargo: { type: String, required: true },
  salario: { type: Number, required: true },
  logradouro: { type: String, required: true },
  numero: { type: String, required: true },
  complemento: { type: String },
  bairro: { type: String, required: true },
  cidade: { type: String, required: true },
  estado: { type: String, required: true },
  cep: { type: String, required: true },
  informacoesComplementares: { type: String },
  nomePai: { type: String },
  nomeMae: { type: String },
  estadoCivil: { type: String },
  quantidadeFilhos: { type: Number },
  documentos: { type: [String] },
});

const Funcionario = mongoose.model("Funcionario", FuncionarioSchema);

export default Funcionario;
