import mongoose from "mongoose";

const inventarioSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,

      unique: true,
      trim: true,
    },
    nome: {
      type: String,

      trim: true,
    },
    categoria: {
      type: String,

      enum: [
        "Equipamentos",
        "Ferramentas",
        "Materiais de Construção",
        "Máquinas",
        "Veículos",
        "EPI",
        "Outros",
      ],
    },
    subcategoria: {
      type: String,
      trim: true,
    },
    descricao: {
      type: String,
      trim: true,
    },
    marca: {
      type: String,
      trim: true,
    },
    modelo: {
      type: String,
      trim: true,
    },
    numeroSerie: {
      type: String,
      trim: true,
    },
    quantidade: {
      type: Number,

      min: 0,
      default: 1,
    },
    unidade: {
      type: String,

      enum: [
        "Unidade",
        "Metro",
        "Metro²",
        "Metro³",
        "Quilograma",
        "Litro",
        "Caixa",
        "Pacote",
        "Rolo",
        "Par",
        "Saco",
      ],
    },
    valorUnitario: {
      type: Number,
      min: 0,
    },
    dataAquisicao: {
      type: Date,
    },
    fornecedor: {
      type: String,
      trim: true,
    },
    localizacao: {
      type: String,
      trim: true,
    },
    observacoes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,

      enum: ["disponivel", "em_uso", "manutencao", "inativo", "danificado"],
      default: "disponivel",
    },
    obraAtual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Obra",
      default: null,
    },
    alocacoes: [
      {
        obra: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Obra",
        },
        quantidade: {
          type: Number,

          min: 1,
        },
        dataAlocacao: {
          type: Date,

          default: Date.now,
        },
        dataDevolucao: {
          type: Date,
        },
        responsavel: {
          type: String,
          trim: true,
        },
        observacoes: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["ativa", "devolvida", "cancelada"],
          default: "ativa",
        },
      },
    ],
    historico: [
      {
        tipo: {
          type: String,
          enum: [
            "criacao",
            "edicao",
            "alocacao",
            "devolucao",
            "manutencao",
            "exclusao",
          ],
        },
        descricao: {
          type: String,
        },
        data: {
          type: Date,
          default: Date.now,
        },
        usuario: {
          type: String,
          trim: true,
        },
        dadosAnteriores: {
          type: mongoose.Schema.Types.Mixed,
        },
        dadosNovos: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Índices para melhorar performance
// inventarioSchema.index({ codigo: 1 }); // Removido pois unique: true já cria índice
inventarioSchema.index({ categoria: 1 });
inventarioSchema.index({ subcategoria: 1 });
inventarioSchema.index({ status: 1 });
inventarioSchema.index({ obraAtual: 1 });
inventarioSchema.index({ nome: "text", descricao: "text" });

// Middleware para gerar código automático se não fornecido
inventarioSchema.pre("save", async function (next) {
  if (!this.codigo) {
    const count = await mongoose.model("Inventario").countDocuments();
    this.codigo = `INV${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Método para calcular quantidade disponível
inventarioSchema.methods.getQuantidadeDisponivel = function () {
  const quantidadeAlocada = this.alocacoes
    .filter((alocacao) => alocacao.status === "ativa")
    .reduce((total, alocacao) => total + alocacao.quantidade, 0);

  return this.quantidade - quantidadeAlocada;
};

// Método para verificar se pode ser alocado
inventarioSchema.methods.podeSerAlocado = function (quantidade) {
  return this.getQuantidadeDisponivel() >= quantidade;
};

// Método para alocar item
inventarioSchema.methods.alocarItem = function (dadosAlocacao) {
  if (!this.podeSerAlocado(dadosAlocacao.quantidade)) {
    throw new Error("Quantidade insuficiente para alocação");
  }

  this.alocacoes.push({
    ...dadosAlocacao,
    dataAlocacao: new Date(),
    status: "ativa",
  });

  // Atualizar status se necessário
  if (this.status === "disponivel") {
    this.status = "em_uso";
  }

  return this.save();
};

// Método para devolver item
inventarioSchema.methods.devolverItem = function (
  alocacaoId,
  dadosDevolucao = {}
) {
  const alocacao = this.alocacoes.id(alocacaoId);
  if (!alocacao) {
    throw new Error("Alocação não encontrada");
  }

  alocacao.status = "devolvida";
  alocacao.dataDevolucao = new Date();
  Object.assign(alocacao, dadosDevolucao);

  // Verificar se ainda há alocações ativas
  const alocacoesAtivas = this.alocacoes.filter((a) => a.status === "ativa");
  if (alocacoesAtivas.length === 0) {
    this.status = "disponivel";
  }

  return this.save();
};

const Inventario = mongoose.model("Inventario", inventarioSchema);

export default Inventario;
