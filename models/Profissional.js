import mongoose from "mongoose";

const ProfissionalSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  genero: { type: String, required: true },
  estadoCivil: { type: String, required: true },
  nacionalidade: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  orgaoEmissor: { type: String, required: true },
  dataEmissao: { type: Date, required: true },
  cep: { type: String, required: true },
  endereco: { type: String, required: true },
  bairro: { type: String, required: true },
  cidade: { type: String, required: true },
  estado: { type: String, required: true },
  telefone: { type: String, required: true },
  email: { type: String, required: true },
  cargoPretendido: { type: String, required: true },
  areaAtuacao: { type: String, required: true },
  formacaoAcademica: { type: String, required: true },
  experienciaProfissional: { type: String, required: true },
  habilidades: { type: String, required: true },
  registroProfissional: { type: String },
  tipoContrato: { type: String, required: true },
  cargaHoraria: { type: String, required: true },
  pretensaoSalarial: { type: String, required: true },
});

const Profissional = mongoose.model("Profissional", ProfissionalSchema);

export default Profissional;
