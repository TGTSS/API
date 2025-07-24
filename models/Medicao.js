import mongoose from "mongoose";

const medicaoSchema = new mongoose.Schema({
  obraId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Obra",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  responsavel: {
    type: String,
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
    enum: ["Aprovação", "Em andamento", "Concluído"],
    default: "Aprovação",
  },
  groups: [
    {
      id: {
        type: String,
      },
      title: {
        type: String,
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
          },
          description: {
            type: String,
          },
          unit: {
            type: String,
            default: "un",
          },
          plannedQuantity: {
            type: Number,

            min: 0,
          },
          value: {
            type: Number,

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
            enum: ["Aprovação", "Em andamento", "Concluído"],
            default: "Aprovação",
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
              enum: ["A iniciar", "Em andamento", "Concluído"],
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
              },
              value: {
                type: Number,
              },
              percentage: {
                type: Number,

                min: 0,
                max: 100,
              },
              status: {
                type: String,
                enum: ["A iniciar", "Em andamento", "Concluído"],
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
          // Mídias obrigatórias do item (imagens e vídeos)
          media: [
            {
              name: {
                type: String,
              },
              url: {
                type: String,
              },
              type: {
                type: String,

                enum: [
                  "image/jpeg",
                  "image/png",
                  "image/gif",
                  "video/mp4",
                  "video/avi",
                  "video/mov",
                  "video/wmv",
                ],
              },
              size: {
                type: Number,
              },
              etapaItem: [
                {
                  etapa: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Etapa",
                  },
                  item: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Item",
                  },
                },
              ],
              description: {
                type: String,
                default: "Mídia do item",
              },
              uploadedAt: {
                type: Date,
                default: Date.now,
              },
              isMain: {
                type: Boolean,
                default: false,
              },
              isVideo: {
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
    },
  ],
  comments: {
    type: String,
  },
  // Mídias obrigatórias da medição (imagens e vídeos)
  media: [
    {
      name: {
        type: String,
      },
      url: {
        type: String,
      },
      type: {
        type: String,

        enum: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "video/mp4",
          "video/avi",
          "video/mov",
          "video/wmv",
        ],
      },
      size: {
        type: Number,
      },
      description: {
        type: String,
        default: "Mídia da medição",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      isMain: {
        type: Boolean,
        default: false,
      },
      isVideo: {
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

// Validação para garantir que cada medição tenha pelo menos uma mídia
medicaoSchema.pre("save", function (next) {
  // Verificar se a medição tem pelo menos uma mídia
  if (!this.media || this.media.length === 0) {
    return next(
      new Error("Cada medição deve ter pelo menos uma mídia (imagem ou vídeo)")
    );
  }

  // (Regra removida) Não exige mais mídia obrigatória em cada item

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

// Método para adicionar mídia à medição
medicaoSchema.methods.addMedia = function (mediaData) {
  if (!this.media) {
    this.media = [];
  }

  // Determinar se é vídeo baseado no tipo
  const isVideo = mediaData.type && mediaData.type.startsWith("video/");

  // Se for a primeira mídia, marcar como principal
  if (this.media.length === 0) {
    mediaData.isMain = true;
  }

  this.media.push({
    name: mediaData.name,
    url: mediaData.url,
    type: mediaData.type,
    size: mediaData.size,
    description:
      mediaData.description ||
      (isVideo ? "Vídeo da medição" : "Imagem da medição"),
    uploadedAt: new Date(),
    isMain: mediaData.isMain || false,
    isVideo: isVideo,
  });
};

// Método para adicionar mídia a um item específico
medicaoSchema.methods.addItemMedia = function (groupId, itemId, mediaData) {
  const group = this.groups.find((g) => g.id === groupId);
  if (!group) {
    throw new Error("Grupo não encontrado");
  }

  const item = group.items.find((i) => i.id === itemId);
  if (!item) {
    throw new Error("Item não encontrado");
  }

  if (!item.media) {
    item.media = [];
  }

  // Determinar se é vídeo baseado no tipo
  const isVideo = mediaData.type && mediaData.type.startsWith("video/");

  // Se for a primeira mídia do item, marcar como principal
  if (item.media.length === 0) {
    mediaData.isMain = true;
  }

  item.media.push({
    name: mediaData.name,
    url: mediaData.url,
    type: mediaData.type,
    size: mediaData.size,
    description:
      mediaData.description || (isVideo ? "Vídeo do item" : "Imagem do item"),
    uploadedAt: new Date(),
    isMain: mediaData.isMain || false,
    isVideo: isVideo,
  });
};

// Método para obter todas as mídias da medição
medicaoSchema.methods.getAllMedia = function () {
  const allMedia = [];

  // Mídias da medição
  if (this.media && this.media.length > 0) {
    allMedia.push(
      ...this.media.map((media) => ({
        ...media.toObject(),
        source: "medicao",
        sourceId: this._id,
        sourceType: "medicao",
      }))
    );
  }

  // Mídias dos itens
  if (this.groups && this.groups.length > 0) {
    this.groups.forEach((group) => {
      if (group.items && group.items.length > 0) {
        group.items.forEach((item) => {
          if (item.media && item.media.length > 0) {
            allMedia.push(
              ...item.media.map((media) => ({
                ...media.toObject(),
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

  return allMedia;
};

// Método para definir mídia principal
medicaoSchema.methods.setMainMedia = function (mediaId) {
  if (!this.media || this.media.length === 0) {
    throw new Error("Não há mídias para definir como principal");
  }

  // Remover marcação de principal de todas as mídias
  this.media.forEach((media) => {
    media.isMain = false;
  });

  // Encontrar e marcar a mídia especificada como principal
  const media = this.media.find((media) => media._id.toString() === mediaId);
  if (!media) {
    throw new Error("Mídia não encontrada");
  }

  media.isMain = true;
};

const Medicao = mongoose.model("Medicao", medicaoSchema);

export default Medicao;
