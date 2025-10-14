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

    // Referência polimórfica do contratante (Cliente ou Fornecedor)
    contratanteRef: {
      id: { type: mongoose.Schema.Types.ObjectId, required: false },
      model: { type: String, enum: ["Cliente", "Fornecedor"], required: false },
    },

    contratante: {
      id: { type: String },
      tipo: {
        type: String,
        enum: ["Cliente", "Fornecedor"],
        default: "Cliente",
      },
      nome: { type: String, trim: true },
      razaoSocial: { type: String, default: "" },
      nomeFantasia: { type: String, default: "" },
      nacionalidade: { type: String, default: "Brasileira" },
      profissao: { type: String, default: "" },
      estadoCivil: { type: String, default: "Solteiro(a)" },
      rg: { type: String, default: "" },
      cpfCnpj: { type: String, default: "" },
      inscricaoEstadual: { type: String, default: "" },
      inscricaoMunicipal: { type: String, default: "" },
      endereco: { type: String, default: "" },
      numero: { type: String, default: "" },
      bairro: { type: String, default: "" },
      cidade: { type: String, default: "Mossoró" },
      estado: { type: String, default: "RN" },
      cep: { type: String, default: "" },
      telefone1: { type: String, default: "" },
      telefone2: { type: String, default: "" },
      email: { type: String, default: "" },
      complemento: { type: String, default: "" },
      informacoesComplementares: { type: String, default: "" },
    },

    // Empreiteiro referenciado (Funcionario) + snapshot
    empreiteiroRef: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Funcionario" },
    },
    empreiteiro: {
      id: { type: String },
      nome: { type: String, trim: true },
      nacionalidade: { type: String, default: "Brasileira" },
      profissao: { type: String, default: "" },
      estadoCivil: { type: String, default: "Solteiro(a)" },
      rg: { type: String, default: "" },
      cpf: { type: String, default: "" },
      endereco: { type: String, default: "" },
      numero: { type: String, default: "" },
      bairro: { type: String, default: "" },
      cidade: { type: String, default: "Mossoró" },
      estado: { type: String, default: "RN" },
      cep: { type: String, default: "" },
      telefone1: { type: String, default: "" },
      telefone2: { type: String, default: "" },
      email: { type: String, default: "" },
      cargo: { type: String, default: "" },
      salario: { type: Number, default: 0 },
      complemento: { type: String, default: "" },
      informacoesComplementares: { type: String, default: "" },
      nomePai: { type: String, default: "" },
      nomeMae: { type: String, default: "" },
      quantidadeFilhos: { type: Number, default: 0 },
      //documentos: [
      //{
      //  tipo: String,
      //  numero: String,
      //  orgaoEmissor: String,
      //  dataEmissao: Date,
      //},
      //],
    },

    // Obras vinculadas por referência
    obrasRef: [{ type: mongoose.Schema.Types.ObjectId, ref: "Obra" }],

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

    // Insumos por referência
    insumosRef: [{ type: mongoose.Schema.Types.ObjectId, ref: "Insumo" }],

    // Composições por referência
    composicoesRef: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Composicao" },
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

// Pre-validate to hydrate contratante snapshot from Cliente/Fornecedor if contratanteRef provided
contratoSchema.pre("validate", async function (next) {
  try {
    if (
      !this.contratanteRef ||
      !this.contratanteRef.id ||
      !this.contratanteRef.model
    ) {
      return next();
    }

    const modelName = this.contratanteRef.model;
    const referencedId = this.contratanteRef.id;

    const Model = this.model(modelName);
    if (!Model) return next();

    const refDoc = await Model.findById(referencedId).lean();
    if (!refDoc) return next();

    // Map core fields from Cliente/Fornecedor into contratante snapshot
    const snapshot = {
      id: String(refDoc._id),
      nome: refDoc.nome || refDoc.nomeFantasia || refDoc.razaoSocial || "",
      nacionalidade: this.contratante?.nacionalidade || "Brasileira",
      profissao: this.contratante?.profissao || "",
      estadoCivil: this.contratante?.estadoCivil || "Solteiro(a)",
      rg: this.contratante?.rg || "",
      cpf: refDoc.cpf || this.contratante?.cpf || "",
      endereco: refDoc.logradouro || this.contratante?.endereco || "",
      numero: refDoc.numero || this.contratante?.numero || "",
      bairro: refDoc.bairro || this.contratante?.bairro || "",
      cidade: refDoc.cidade || this.contratante?.cidade || "Mossoró",
      estado: refDoc.estado || this.contratante?.estado || "RN",
      cep: refDoc.cep || this.contratante?.cep || "",
      telefone1: refDoc.telefone1 || this.contratante?.telefone1 || "",
      telefone2: this.contratante?.telefone2 || "",
      email: refDoc.email || this.contratante?.email || "",
      complemento: refDoc.complemento || this.contratante?.complemento || "",
      informacoesComplementares:
        refDoc.informacoesComplementares ||
        this.contratante?.informacoesComplementares ||
        "",
    };

    this.contratante = snapshot;
    // Hydrate empreiteiro snapshot if empreiteiroRef provided
    if (this.empreiteiroRef && this.empreiteiroRef.id) {
      const FuncionarioModel = this.model("Funcionario");
      if (FuncionarioModel) {
        const func = await FuncionarioModel.findById(
          this.empreiteiroRef.id
        ).lean();
        if (func) {
          this.empreiteiro = {
            id: String(func._id),
            nome: func.nome || this.empreiteiro?.nome || "",
            nacionalidade: this.empreiteiro?.nacionalidade || "Brasileira",
            profissao: this.empreiteiro?.profissao || "",
            estadoCivil:
              func.estadoCivil ||
              this.empreiteiro?.estadoCivil ||
              "Solteiro(a)",
            rg: this.empreiteiro?.rg || "",
            cpf: func.cpf || this.empreiteiro?.cpf || "",
            endereco: func.logradouro || this.empreiteiro?.endereco || "",
            numero: func.numero || this.empreiteiro?.numero || "",
            bairro: func.bairro || this.empreiteiro?.bairro || "",
            cidade: func.cidade || this.empreiteiro?.cidade || "Mossoró",
            estado: func.estado || this.empreiteiro?.estado || "RN",
            cep: func.cep || this.empreiteiro?.cep || "",
            telefone1: func.telefone1 || this.empreiteiro?.telefone1 || "",
            telefone2: func.telefone2 || this.empreiteiro?.telefone2 || "",
            email: func.email || this.empreiteiro?.email || "",
            cargo: func.cargo || this.empreiteiro?.cargo || "",
            salario: func.salario || this.empreiteiro?.salario || 0,
            complemento:
              func.complemento || this.empreiteiro?.complemento || "",
            informacoesComplementares:
              func.informacoesComplementares ||
              this.empreiteiro?.informacoesComplementares ||
              "",
            nomePai: func.nomePai || this.empreiteiro?.nomePai || "",
            nomeMae: func.nomeMae || this.empreiteiro?.nomeMae || "",
            quantidadeFilhos:
              func.quantidadeFilhos || this.empreiteiro?.quantidadeFilhos || 0,
          };
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
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
  const obrasEmb = Array.isArray(this.obras) ? this.obras : [];
  if (obrasEmb.length === 0) return 0;
  const somaProgresso = obrasEmb.reduce(
    (acc, obra) => acc + (obra.progresso || 0),
    0
  );
  return somaProgresso / obrasEmb.length;
};

// Método para calcular valor executado
contratoSchema.methods.calcularValorExecutado = function () {
  const obrasEmb = Array.isArray(this.obras) ? this.obras : [];
  return obrasEmb.reduce((acc, obra) => {
    const valor = Number(obra.valorContrato || 0);
    const prog = Number(obra.progresso || 0);
    return acc + valor * (prog / 100);
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
