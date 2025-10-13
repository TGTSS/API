import mongoose from "mongoose";

const contratoSchema = new mongoose.Schema(
  {
    // Dados básicos do contrato
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    descricao: {
      type: String,
      required: true,
      trim: true,
    },
    tipoContrato: {
      type: String,
      required: true,
      enum: [
        "Empreitada - Mão de Obra",
        "Empreitada - Mão de Obra e Materiais",
        "Administração",
      ],
      default: "Empreitada - Mão de Obra",
    },
    valorTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["A iniciar", "Em Andamento", "Concluído", "Suspenso", "Cancelado"],
      default: "A iniciar",
    },
    dataInicio: {
      type: Date,
      required: true,
    },
    prazoExecucaoDias: {
      type: Number,
      required: true,
      min: 1,
    },
    responsavel: {
      type: String,
      required: true,
      trim: true,
    },

    // Informações do contratante
    contratante: {
      id: {
        type: String,
        required: true,
      },
      nome: {
        type: String,
        required: true,
        trim: true,
      },
      nacionalidade: {
        type: String,
        default: "Brasileira",
      },
      profissao: {
        type: String,
        default: "",
      },
      estadoCivil: {
        type: String,
        default: "Solteiro(a)",
      },
      rg: {
        type: String,
        default: "",
      },
      cpf: {
        type: String,
        default: "",
      },
      endereco: {
        type: String,
        default: "",
      },
      numero: {
        type: String,
        default: "",
      },
      bairro: {
        type: String,
        default: "",
      },
      cidade: {
        type: String,
        default: "Mossoró",
      },
      estado: {
        type: String,
        default: "RN",
      },
      cep: {
        type: String,
        default: "",
      },
      telefone1: {
        type: String,
        default: "",
      },
      telefone2: {
        type: String,
        default: "",
      },
      email: {
        type: String,
        default: "",
      },
      complemento: {
        type: String,
        default: "",
      },
      informacoesComplementares: {
        type: String,
        default: "",
      },
    },

    // Informações do empreiteiro
    empreiteiro: {
      id: {
        type: String,
        required: true,
      },
      nome: {
        type: String,
        required: true,
        trim: true,
      },
      nacionalidade: {
        type: String,
        default: "Brasileira",
      },
      profissao: {
        type: String,
        default: "",
      },
      estadoCivil: {
        type: String,
        default: "Solteiro(a)",
      },
      rg: {
        type: String,
        default: "",
      },
      cpf: {
        type: String,
        default: "",
      },
      endereco: {
        type: String,
        default: "",
      },
      numero: {
        type: String,
        default: "",
      },
      bairro: {
        type: String,
        default: "",
      },
      cidade: {
        type: String,
        default: "Mossoró",
      },
      estado: {
        type: String,
        default: "RN",
      },
      cep: {
        type: String,
        default: "",
      },
      telefone1: {
        type: String,
        default: "",
      },
      telefone2: {
        type: String,
        default: "",
      },
      email: {
        type: String,
        default: "",
      },
      cargo: {
        type: String,
        default: "",
      },
      salario: {
        type: Number,
        default: 0,
      },
      complemento: {
        type: String,
        default: "",
      },
      informacoesComplementares: {
        type: String,
        default: "",
      },
      nomePai: {
        type: String,
        default: "",
      },
      nomeMae: {
        type: String,
        default: "",
      },
      quantidadeFilhos: {
        type: Number,
        default: 0,
      },
      documentos: [
        {
          tipo: String,
          numero: String,
          orgaoEmissor: String,
          dataEmissao: Date,
        },
      ],
    },

    // Dados do imóvel
    imovel: {
      tipo: {
        type: String,
        enum: ["Residencial", "Comercial", "Industrial", "Rural"],
        default: "Residencial",
      },
      endereco: {
        type: String,
        default: "",
      },
      numero: {
        type: String,
        default: "",
      },
      bairro: {
        type: String,
        default: "",
      },
      cidade: {
        type: String,
        default: "Mossoró",
      },
      estado: {
        type: String,
        default: "RN",
      },
    },

    // Dados da planta
    planta: {
      engenheiro: {
        type: String,
        default: "",
      },
      numeroAprovacao: {
        type: String,
        default: "",
      },
    },

    // Dados de pagamento
    pagamento: {
      formaPagamento: {
        type: String,
        enum: ["Por Medição", "À Vista", "Parcelado"],
        default: "Por Medição",
      },
      prazoAprovacao: {
        type: Number,
        default: 3,
        min: 1,
      },
      contaBancaria: {
        type: String,
        default: "",
      },
      titularConta: {
        type: String,
        default: "",
      },
    },

    // Obras vinculadas ao contrato
    obras: [
      {
        id: {
          type: String,
          required: true,
        },
        nome: {
          type: String,
          required: true,
        },
        valorContrato: {
          type: Number,
          required: true,
          min: 0,
        },
        progresso: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        endereco: {
          logradouro: String,
          numero: String,
          complemento: String,
          bairro: String,
          cidade: String,
          estado: String,
          cep: String,
          enderecoCompleto: String,
        },
      },
    ],

    // Endereços das obras (para facilitar consultas)
    enderecosObras: [String],

    // Insumos do contrato
    insumos: [
      {
        id: {
          type: String,
          required: true,
        },
        nome: {
          type: String,
          required: true,
        },
        descricao: {
          type: String,
          default: "",
        },
        unidade: {
          type: String,
          required: true,
        },
        valorUnitario: {
          type: Number,
          required: true,
          min: 0,
        },
        categoria: {
          type: String,
          default: "",
        },
      },
    ],

    // Composições do contrato
    composicoes: [
      {
        id: {
          type: String,
          required: true,
        },
        nome: {
          type: String,
          required: true,
        },
        descricaoComposicao: {
          type: String,
          default: "",
        },
        unidade: {
          type: String,
          required: true,
        },
        valorUnitario: {
          type: Number,
          required: true,
          min: 0,
        },
        categoria: {
          type: String,
          default: "",
        },
      },
    ],

    // Medições do contrato
    medicoes: [
      {
        id: {
          type: String,
          required: true,
        },
        data: {
          type: Date,
          required: true,
        },
        responsavel: {
          type: String,
          required: true,
        },
        observacoes: {
          type: String,
          default: "",
        },
        medicoesPorObra: [
          {
            obraId: {
              type: String,
              required: true,
            },
            obraNome: {
              type: String,
              required: true,
            },
            valorContrato: {
              type: Number,
              required: true,
            },
            quantidadeExecutada: {
              type: Number,
              default: 0,
            },
            valorExecutado: {
              type: Number,
              default: 0,
            },
            percentualExecutado: {
              type: Number,
              default: 0,
              min: 0,
              max: 100,
            },
            observacoes: {
              type: String,
              default: "",
            },
          },
        ],
        vistoriaRealizada: {
          type: Boolean,
          default: false,
        },
        vistoriadoPor: {
          type: String,
          default: "",
        },
        desperdicioDeMaterial: {
          type: Boolean,
          default: false,
        },
        valorDesperdicio: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    // Metadados
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para atualizar updatedAt antes de salvar
contratoSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Middleware para atualizar updatedAt antes de atualizar
contratoSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Índices para melhorar performance
contratoSchema.index({ nome: 1 });
contratoSchema.index({ status: 1 });
contratoSchema.index({ tipoContrato: 1 });
contratoSchema.index({ "contratante.nome": 1 });
contratoSchema.index({ "empreiteiro.nome": 1 });
contratoSchema.index({ dataInicio: 1 });
contratoSchema.index({ createdAt: -1 });

// Método para calcular progresso médio
contratoSchema.methods.calcularProgressoMedio = function () {
  if (this.obras.length === 0) return 0;

  const somaProgresso = this.obras.reduce(
    (acc, obra) => acc + obra.progresso,
    0
  );
  return somaProgresso / this.obras.length;
};

// Método para calcular valor executado
contratoSchema.methods.calcularValorExecutado = function () {
  return this.obras.reduce((acc, obra) => {
    return acc + obra.valorContrato * (obra.progresso / 100);
  }, 0);
};

// Método para calcular saldo restante
contratoSchema.methods.calcularSaldoRestante = function () {
  return this.valorTotal - this.calcularValorExecutado();
};

// Método para verificar se contrato está ativo
contratoSchema.methods.isAtivo = function () {
  return ["A iniciar", "Em Andamento"].includes(this.status);
};

// Método para verificar se contrato está concluído
contratoSchema.methods.isConcluido = function () {
  return this.status === "Concluído";
};

// Virtual para progresso médio
contratoSchema.virtual("progressoMedio").get(function () {
  return this.calcularProgressoMedio();
});

// Virtual para valor executado
contratoSchema.virtual("valorExecutado").get(function () {
  return this.calcularValorExecutado();
});

// Virtual para saldo restante
contratoSchema.virtual("saldoRestante").get(function () {
  return this.calcularSaldoRestante();
});

// Configurar para incluir virtuals no JSON
contratoSchema.set("toJSON", { virtuals: true });
contratoSchema.set("toObject", { virtuals: true });

const Contrato = mongoose.model("Contrato", contratoSchema);

export default Contrato;
