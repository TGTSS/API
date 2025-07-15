import mongoose from "mongoose";

const medicaoSchema = new mongoose.Schema({
  obraId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Obra",
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  responsavel: {
    type: String,
    required: true,
  },
  totalMedido: {
    type: Number,
    default: 0,
  },
  progressoGeral: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  status: {
    type: String,
    enum: ["Aprovado", "Em revisão", "Pendente"],
    default: "Pendente",
  },
  groups: [
    {
      id: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      progresso: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      items: [
        {
          id: {
            type: String,
            required: true,
          },
          description: {
            type: String,
            required: true,
          },
          unit: {
            type: String,
            default: "un",
          },
          plannedQuantity: {
            type: Number,
            required: true,
            min: 0,
          },
          value: {
            type: Number,
            required: true,
            min: 0,
          },
          executedQuantity: {
            type: Number,
            default: 0,
            min: 0,
          },
          executedValue: {
            type: Number,
            default: 0,
            min: 0,
          },
          percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
          },
          status: {
            type: String,
            enum: ["Aprovado", "Em revisão", "Pendente"],
            default: "Pendente",
          },
          lastMeasurement: {
            date: {
              type: Date,
              default: Date.now,
            },
            quantity: {
              type: Number,
              default: 0,
            },
            value: {
              type: Number,
              default: 0,
            },
            percentage: {
              type: Number,
              default: 0,
            },
            status: {
              type: String,
              enum: ["Aprovado", "Em revisão", "Pendente"],
            },
            comments: {
              type: String,
            },
            responsavel: {
              type: String,
            },
          },
          history: [
            {
              date: {
                type: Date,
                default: Date.now,
              },
              quantity: {
                type: Number,
                required: true,
              },
              value: {
                type: Number,
                required: true,
              },
              percentage: {
                type: Number,
                required: true,
                min: 0,
                max: 100,
              },
              status: {
                type: String,
                enum: ["Aprovado", "Em revisão", "Pendente"],
                required: true,
              },
              comments: {
                type: String,
              },
              responsavel: {
                type: String,
              },
              attachments: [
                {
                  name: {
                    type: String,
                  },
                  url: {
                    type: String,
                  },
                  type: {
                    type: String,
                  },
                  size: {
                    type: Number,
                  },
                  uploadedAt: {
                    type: Date,
                    default: Date.now,
                  },
                },
              ],
            },
          ],
          // Imagens obrigatórias do item
          images: [
            {
              name: {
                type: String,
                required: true,
              },
              url: {
                type: String,
                required: true,
              },
              type: {
                type: String,
                default: "image/jpeg",
              },
              size: {
                type: Number,
              },
              description: {
                type: String,
                default: "Imagem do item",
              },
              uploadedAt: {
                type: Date,
                default: Date.now,
              },
              isMain: {
                type: Boolean,
                default: false,
              },
            },
          ],
          // Anexos opcionais do item
          attachments: [
            {
              name: {
                type: String,
                required: true,
              },
              url: {
                type: String,
                required: true,
              },
              type: {
                type: String,
              },
              size: {
                type: Number,
              },
              uploadedAt: {
                type: Date,
                default: Date.now,
              },
            },
          ],
        },
      ],
    },
  ],
  comments: {
    type: String,
  },
  // Imagens obrigatórias da medição
  images: [
    {
      name: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        default: "image/jpeg",
      },
      size: {
        type: Number,
      },
      description: {
        type: String,
        default: "Imagem da medição",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      isMain: {
        type: Boolean,
        default: false,
      },
    },
  ],
  // Anexos opcionais (documentos, etc.)
  attachments: [
    {
      name: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
      },
      size: {
        type: Number,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

// Middleware para atualizar o campo updatedAt
medicaoSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Validação para garantir que cada medição tenha pelo menos uma imagem
medicaoSchema.pre("save", function (next) {
  // Verificar se a medição tem pelo menos uma imagem
  if (!this.images || this.images.length === 0) {
    return next(new Error("Cada medição deve ter pelo menos uma imagem"));
  }

  // Verificar se cada grupo tem pelo menos um item com imagem
  if (this.groups && this.groups.length > 0) {
    for (const group of this.groups) {
      if (group.items && group.items.length > 0) {
        for (const item of group.items) {
          if (!item.images || item.images.length === 0) {
            return next(
              new Error(
                `Item "${item.description}" deve ter pelo menos uma imagem`
              )
            );
          }
        }
      }
    }
  }

  next();
});

// Método para calcular o progresso geral
medicaoSchema.methods.calculateProgress = function () {
  if (!this.groups || this.groups.length === 0) {
    this.progressoGeral = 0;
    return;
  }

  let totalProgress = 0;
  let totalItems = 0;

  this.groups.forEach((group) => {
    if (group.items && group.items.length > 0) {
      group.items.forEach((item) => {
        totalProgress += item.percentage || 0;
        totalItems++;
      });
    }
  });

  this.progressoGeral = totalItems > 0 ? totalProgress / totalItems : 0;
};

// Método para calcular o valor total medido
medicaoSchema.methods.calculateTotalMedido = function () {
  if (!this.groups || this.groups.length === 0) {
    this.totalMedido = 0;
    return;
  }

  this.totalMedido = this.groups.reduce((total, group) => {
    if (group.items && group.items.length > 0) {
      return (
        total +
        group.items.reduce((groupTotal, item) => {
          return groupTotal + (item.executedValue || 0);
        }, 0)
      );
    }
    return total;
  }, 0);
};

// Método para adicionar uma nova medição a um item
medicaoSchema.methods.addItemMeasurement = function (
  groupId,
  itemId,
  measurementData
) {
  const group = this.groups.find((g) => g.id === groupId);
  if (!group) {
    throw new Error("Grupo não encontrado");
  }

  const item = group.items.find((i) => i.id === itemId);
  if (!item) {
    throw new Error("Item não encontrado");
  }

  // Verificar se não está regredindo
  const lastMeasurement =
    item.history.length > 0 ? item.history[item.history.length - 1] : null;
  if (
    lastMeasurement &&
    measurementData.percentage < lastMeasurement.percentage
  ) {
    throw new Error("Não é permitido regredir a porcentagem de execução");
  }

  // Criar nova entrada no histórico
  const newHistoryEntry = {
    date: new Date(),
    quantity: measurementData.quantity || 0,
    value: measurementData.value || 0,
    percentage: measurementData.percentage || 0,
    status: measurementData.status || "Em revisão",
    comments: measurementData.comments || "",
    responsavel: measurementData.responsavel || this.responsavel,
    attachments: measurementData.attachments || [],
  };

  // Atualizar item
  item.executedQuantity = measurementData.quantity || 0;
  item.executedValue = measurementData.value || 0;
  item.percentage = measurementData.percentage || 0;
  item.status = measurementData.status || "Em revisão";
  item.lastMeasurement = newHistoryEntry;
  item.history.push(newHistoryEntry);

  // Recalcular totais
  this.calculateTotalMedido();
  this.calculateProgress();
};

// Método para preencher medição por etapa
medicaoSchema.methods.fillStageByPercentage = function (groupId, percentage) {
  const group = this.groups.find((g) => g.id === groupId);
  if (!group) {
    throw new Error("Grupo não encontrado");
  }

  if (percentage < 0 || percentage > 100) {
    throw new Error("Porcentagem deve estar entre 0 e 100");
  }

  group.items.forEach((item) => {
    // Se o item já está 100% concluído, não permite alteração
    if (item.percentage === 100) {
      return;
    }

    // Verifica se o novo valor é menor que o último valor medido
    const lastMeasurement =
      item.history.length > 0 ? item.history[item.history.length - 1] : null;
    if (lastMeasurement && percentage < lastMeasurement.percentage) {
      throw new Error(
        `Não é permitido regredir a porcentagem do item ${item.description}`
      );
    }

    const newExecutedQuantity = (item.plannedQuantity * percentage) / 100;
    const newExecutedValue = newExecutedQuantity * item.value;
    const newPercentage = percentage;
    const status = newPercentage === 100 ? "Aprovado" : "Em revisão";

    // Criar nova entrada no histórico
    const newHistoryEntry = {
      date: new Date(),
      quantity: newExecutedQuantity,
      value: newExecutedValue,
      percentage: newPercentage,
      status,
      comments: `Preenchimento automático por etapa: ${percentage}%`,
      responsavel: this.responsavel,
    };

    // Atualizar item
    item.executedQuantity = newExecutedQuantity;
    item.executedValue = newExecutedValue;
    item.percentage = Math.round(newPercentage);
    item.status = status;
    item.lastMeasurement = newHistoryEntry;
    item.history.push(newHistoryEntry);
  });

  // Recalcular totais
  this.calculateTotalMedido();
  this.calculateProgress();
};

// Método para adicionar imagem à medição
medicaoSchema.methods.addImage = function (imageData) {
  if (!this.images) {
    this.images = [];
  }

  // Se for a primeira imagem, marcar como principal
  if (this.images.length === 0) {
    imageData.isMain = true;
  }

  this.images.push({
    name: imageData.name,
    url: imageData.url,
    type: imageData.type || "image/jpeg",
    size: imageData.size,
    description: imageData.description || "Imagem da medição",
    uploadedAt: new Date(),
    isMain: imageData.isMain || false,
  });
};

// Método para adicionar imagem a um item específico
medicaoSchema.methods.addItemImage = function (groupId, itemId, imageData) {
  const group = this.groups.find((g) => g.id === groupId);
  if (!group) {
    throw new Error("Grupo não encontrado");
  }

  const item = group.items.find((i) => i.id === itemId);
  if (!item) {
    throw new Error("Item não encontrado");
  }

  if (!item.images) {
    item.images = [];
  }

  // Se for a primeira imagem do item, marcar como principal
  if (item.images.length === 0) {
    imageData.isMain = true;
  }

  item.images.push({
    name: imageData.name,
    url: imageData.url,
    type: imageData.type || "image/jpeg",
    size: imageData.size,
    description: imageData.description || "Imagem do item",
    uploadedAt: new Date(),
    isMain: imageData.isMain || false,
  });
};

// Método para obter todas as imagens da medição
medicaoSchema.methods.getAllImages = function () {
  const allImages = [];

  // Imagens da medição
  if (this.images && this.images.length > 0) {
    allImages.push(
      ...this.images.map((img) => ({
        ...img.toObject(),
        source: "medicao",
        sourceId: this._id,
        sourceType: "medicao",
      }))
    );
  }

  // Imagens dos itens
  if (this.groups && this.groups.length > 0) {
    this.groups.forEach((group) => {
      if (group.items && group.items.length > 0) {
        group.items.forEach((item) => {
          if (item.images && item.images.length > 0) {
            allImages.push(
              ...item.images.map((img) => ({
                ...img.toObject(),
                source: "item",
                sourceId: item.id,
                sourceType: "item",
                itemDescription: item.description,
                groupTitle: group.title,
              }))
            );
          }
        });
      }
    });
  }

  return allImages;
};

// Método para definir imagem principal
medicaoSchema.methods.setMainImage = function (imageId) {
  if (!this.images || this.images.length === 0) {
    throw new Error("Não há imagens para definir como principal");
  }

  // Remover marcação de principal de todas as imagens
  this.images.forEach((img) => {
    img.isMain = false;
  });

  // Encontrar e marcar a imagem especificada como principal
  const image = this.images.find((img) => img._id.toString() === imageId);
  if (!image) {
    throw new Error("Imagem não encontrada");
  }

  image.isMain = true;
};

const Medicao = mongoose.model("Medicao", medicaoSchema);

export default Medicao;
