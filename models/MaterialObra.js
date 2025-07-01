import mongoose from "mongoose";

const materialObraSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    codigo: {
      type: String,
      trim: true,
      unique: true,
    },
    tipo: {
      type: String,
      enum: ["Material", "Equipamento"],
      default: "Material",
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
    quantidade: {
      type: Number,
      required: true,
      min: 0,
    },
    unidade: {
      type: String,
      trim: true,
    },
    fornecedor: {
      type: String,
      trim: true,
    },
    dataAquisicao: {
      type: Date,
    },
    dataEntrega: {
      type: Date,
    },
    estadoAquisicao: {
      type: String,
      enum: [
        "Excelente",
        "Bom",
        "Regular",
        "Em Manutenção",
        "Com Problema",
        "Ruim",
        "Inutilizável",
      ],
      default: "Bom",
    },
    estadoEntrega: {
      type: String,
      enum: [
        "Excelente",
        "Bom",
        "Regular",
        "Em Manutenção",
        "Com Problema",
        "Ruim",
        "Inutilizável",
      ],
      default: "Bom",
    },
    localizacao: {
      type: String,
      trim: true,
    },
    observacoes: {
      type: String,
      trim: true,
    },
    obra: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Obra",
      required: true,
    },
    status: {
      type: String,
      enum: ["Ativo", "Inativo", "Em Manutenção", "Descartado"],
      default: "Ativo",
    },
    valorUnitario: {
      type: Number,
      min: 0,
    },
    valorTotal: {
      type: Number,
      min: 0,
    },
    responsavel: {
      type: String,
      trim: true,
    },
    dataCadastro: {
      type: Date,
      default: Date.now,
    },
    dataAtualizacao: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para melhorar performance
materialObraSchema.index({ obra: 1, tipo: 1 });
materialObraSchema.index({ codigo: 1 });
materialObraSchema.index({ status: 1 });
materialObraSchema.index({ categoria: 1 });

// Middleware para atualizar dataAtualizacao
materialObraSchema.pre("save", function (next) {
  this.dataAtualizacao = new Date();
  next();
});

// Middleware para calcular valorTotal se valorUnitario e quantidade estiverem presentes
materialObraSchema.pre("save", function (next) {
  if (this.valorUnitario && this.quantidade) {
    this.valorTotal = this.valorUnitario * this.quantidade;
  }
  next();
});

// Método estático para gerar código único
materialObraSchema.statics.gerarCodigo = async function (categoria, obraId) {
  const prefixo = categoria.substring(0, 3).toUpperCase();
  const count = await this.countDocuments({ obra: obraId, categoria });
  return `${prefixo}${(count + 1).toString().padStart(3, "0")}`;
};

// Método de instância para obter informações resumidas
materialObraSchema.methods.getResumo = function () {
  return {
    id: this._id,
    nome: this.nome,
    codigo: this.codigo,
    tipo: this.tipo,
    categoria: this.categoria,
    quantidade: this.quantidade,
    unidade: this.unidade,
    status: this.status,
    estadoAtual: this.estadoEntrega || this.estadoAquisicao,
  };
};

const MaterialObra = mongoose.model("MaterialObra", materialObraSchema);

export default MaterialObra;
