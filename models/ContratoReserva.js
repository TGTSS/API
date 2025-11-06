import mongoose from "mongoose";

const EnderecoSchema = new mongoose.Schema(
  {
    logradouro: String,
    numero: String,
    complemento: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String,
    lote: String,
    quadra: String,
    enderecoCompleto: String,
  },
  { _id: false }
);

const ImobiliariaSchema = new mongoose.Schema(
  {
    razaoSocial: { type: String },
    cnpj: String,
    creci: String,
    endereco: String,
    cidade: String,
    estado: String,
    cep: String,
    representante: String,
    cpfRepresentante: String,
  },
  { _id: false }
);

const ConstrutoraSchema = new mongoose.Schema(
  {
    razaoSocial: { type: String, required: true },
    cnpj: String,
    endereco: String,
    cidade: String,
    estado: String,
  },
  { _id: false }
);

const CompradorSchema = new mongoose.Schema(
  {
    nome: { type: String },
    cpf: String,
    rg: String,
    profissao: String,
    estadoCivil: String,
    endereco: String,
    cidade: String,
    estado: String,
    cep: String,
  },
  { _id: false }
);

const ImovelSchema = new mongoose.Schema(
  {
    nome: String,
    endereco: String,
    cidade: String,
    estado: String,
    caracteristicas: String,
    tipo: String,
    enderecoDetalhado: EnderecoSchema,
    obraRef: { type: mongoose.Schema.Types.ObjectId, ref: "Obra" },
  },
  { _id: false }
);

const CondicoesSchema = new mongoose.Schema(
  {
    valorTotal: { type: Number, default: 0 },
    financiamento: { type: Number, default: 0 },
    subsidio: { type: Number, default: 0 },
    totalFinanciamento: { type: Number, default: 0 },
    entrada: { type: Number, default: 0 },
    banco: String,
    multaDesistencia: { type: Number, default: 0 },
    multaRescisao: { type: Number, default: 0 },
    honorariosAdvocaticios: { type: Number, default: 0 },
  },
  { _id: false }
);

const ContratoReservaSchema = new mongoose.Schema(
  {
    numero: { type: String, index: true },
    dataContrato: { type: Date, default: Date.now },
    cidade: String,
    estado: String,

    imobiliaria: ImobiliariaSchema,
    construtora: { type: ConstrutoraSchema, required: true },
    comprador: CompradorSchema,
    imovel: { type: ImovelSchema, required: true },
    condicoes: CondicoesSchema,

    // Links de relacionamento úteis
    clienteRef: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente" },
    obraRef: { type: mongoose.Schema.Types.ObjectId, ref: "Obra" },

    // Metadados
    status: {
      type: String,
      enum: ["Rascunho", "Pendente", "Finalizado", "Cancelado"],
      default: "Rascunho",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ContratoReserva", ContratoReservaSchema);
