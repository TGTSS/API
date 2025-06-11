import mongoose from "mongoose";

const certificadoSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    cnpj: {
      type: String,
      required: true,
      trim: true,
    },
    ufAutor: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    certificadoBase64: {
      type: String,
      required: true,
    },
    senha: {
      type: String,
      required: true,
    },
    dataValidade: {
      type: Date,
      required: true,
    },
    ativo: {
      type: Boolean,
      default: true,
    },
    ultimoNSU: {
      type: Number,
      default: 0,
    },
    maxNSU: {
      type: Number,
      default: 0,
    },
    observacoes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para melhor performance
certificadoSchema.index({ cnpj: 1 });
certificadoSchema.index({ ativo: 1 });
certificadoSchema.index({ dataValidade: 1 });

const Certificado = mongoose.model("Certificado", certificadoSchema);

export default Certificado;
