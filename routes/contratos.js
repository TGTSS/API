import express from "express";
import Contrato from "../models/Contrato.js";
import mongoose from "mongoose";
import crypto from "crypto";

const router = express.Router();

// Função para gerar UUID simples
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// GET /api/contratos - Listar todos os contratos
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      tipoContrato,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Construir filtros
    const filters = {};

    if (status && status !== "all") {
      // Verificar se é um status de contrato ou status de execução
      const statusContrato = [
        "Rascunho",
        "Pendente",
        "Para aprovação",
        "Aprovado",
        "Rejeitado",
      ];
      const statusExecucao = [
        "A iniciar",
        "Em Andamento",
        "Concluído",
        "Suspenso",
        "Cancelado",
      ];

      if (statusContrato.includes(status)) {
        filters.statusContrato = status;
      } else if (statusExecucao.includes(status)) {
        filters.status = status;
      }
    }

    if (tipoContrato && tipoContrato !== "all") {
      filters.tipoContrato = tipoContrato;
    }

    if (search) {
      filters.$or = [
        { nome: { $regex: search, $options: "i" } },
        { descricao: { $regex: search, $options: "i" } },
        { "contratante.nome": { $regex: search, $options: "i" } },
        { "empreiteiro.nome": { $regex: search, $options: "i" } },
      ];
    }

    // Configurar ordenação
    const sortOptions = {};
    if (sortBy === "statusContrato") {
      sortOptions.statusContrato = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "status") {
      sortOptions.status = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    // Calcular paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Buscar contratos
    const contratos = await Contrato.find(filters)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Contar total de documentos
    const total = await Contrato.countDocuments(filters);

    // Calcular estatísticas
    const stats = await Contrato.aggregate([
      {
        $group: {
          _id: null,
          totalContratos: { $sum: 1 },
          valorTotal: { $sum: "$valorTotal" },
          emAndamento: {
            $sum: {
              $cond: [{ $eq: ["$status", "Em Andamento"] }, 1, 0],
            },
          },
          aIniciar: {
            $sum: {
              $cond: [{ $eq: ["$status", "A iniciar"] }, 1, 0],
            },
          },
          concluidos: {
            $sum: {
              $cond: [{ $eq: ["$status", "Concluído"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const estatisticas = stats[0] || {
      totalContratos: 0,
      valorTotal: 0,
      emAndamento: 0,
      aIniciar: 0,
      concluidos: 0,
    };

    res.json({
      contratos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
      stats: estatisticas,
    });
  } catch (error) {
    console.error("Erro ao buscar contratos:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/stats - Obter estatísticas dos contratos
router.get("/stats", async (req, res) => {
  try {
    const stats = await Contrato.aggregate([
      {
        $group: {
          _id: null,
          totalContratos: { $sum: 1 },
          valorTotal: { $sum: "$valorTotal" },
          emAndamento: {
            $sum: {
              $cond: [{ $eq: ["$status", "Em Andamento"] }, 1, 0],
            },
          },
          aIniciar: {
            $sum: {
              $cond: [{ $eq: ["$status", "A iniciar"] }, 1, 0],
            },
          },
          concluidos: {
            $sum: {
              $cond: [{ $eq: ["$status", "Concluído"] }, 1, 0],
            },
          },
          suspensos: {
            $sum: {
              $cond: [{ $eq: ["$status", "Suspenso"] }, 1, 0],
            },
          },
          cancelados: {
            $sum: {
              $cond: [{ $eq: ["$status", "Cancelado"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Calcular valor executado total baseado nas medições
    const contratosComProgresso = await Contrato.find({
      status: { $in: ["Em Andamento", "Concluído"] },
    }).lean();

    const valorExecutado = contratosComProgresso.reduce((acc, contrato) => {
      // Calcular valor executado baseado nas medições
      const valorExecutadoContrato = contrato.medicoes.reduce(
        (sum, medicao) => {
          return (
            sum +
            medicao.medicoesPorObra.reduce((sumObra, medicaoObra) => {
              return sumObra + (medicaoObra.valorExecutado || 0);
            }, 0)
          );
        },
        0
      );
      return acc + valorExecutadoContrato;
    }, 0);

    const estatisticas = stats[0] || {
      totalContratos: 0,
      valorTotal: 0,
      emAndamento: 0,
      aIniciar: 0,
      concluidos: 0,
      suspensos: 0,
      cancelados: 0,
    };

    estatisticas.valorExecutado = valorExecutado;
    estatisticas.saldoRestante = estatisticas.valorTotal - valorExecutado;

    res.json(estatisticas);
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id - Buscar contrato por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id);

    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contrato);
  } catch (error) {
    console.error("Erro ao buscar contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos - Criar novo contrato
router.post("/", async (req, res) => {
  try {
    const contratoData = req.body;

    // Validar e processar dados do contrato
    if (
      contratoData.contratanteRef &&
      contratoData.contratanteRef.id &&
      contratoData.contratanteRef.model
    ) {
      // O modelo irá hidratar automaticamente o snapshot do contratante
      console.log("Contratante será hidratado automaticamente pelo modelo");
    }

    if (contratoData.empreiteiroRef && contratoData.empreiteiroRef.id) {
      // O modelo irá hidratar automaticamente o snapshot do empreiteiro
      console.log("Empreiteiro será hidratado automaticamente pelo modelo");
    }

    const novoContrato = new Contrato(contratoData);
    const contratoSalvo = await novoContrato.save();

    res.status(201).json(contratoSalvo);
  } catch (error) {
    console.error("Erro ao criar contrato:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Dados inválidos",
        errors,
      });
    }

    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PUT /api/contratos/:id - Atualizar contrato
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const contratoData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Validar e processar dados do contrato
    if (
      contratoData.contratanteRef &&
      contratoData.contratanteRef.id &&
      contratoData.contratanteRef.model
    ) {
      // O modelo irá hidratar automaticamente o snapshot do contratante
      console.log("Contratante será hidratado automaticamente pelo modelo");
    }

    if (contratoData.empreiteiroRef && contratoData.empreiteiroRef.id) {
      // O modelo irá hidratar automaticamente o snapshot do empreiteiro
      console.log("Empreiteiro será hidratado automaticamente pelo modelo");
    }

    const contratoAtualizado = await Contrato.findByIdAndUpdate(
      id,
      contratoData,
      { new: true, runValidators: true }
    );

    if (!contratoAtualizado) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contratoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar contrato:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Dados inválidos",
        errors,
      });
    }

    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PATCH /api/contratos/:id/status - Atualizar status do contrato
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusContrato } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const updateData = {};

    if (status) {
      const statusValidos = [
        "A iniciar",
        "Em Andamento",
        "Concluído",
        "Suspenso",
        "Cancelado",
      ];
      if (!statusValidos.includes(status)) {
        return res.status(400).json({
          message: "Status de execução inválido",
          statusValidos,
        });
      }
      updateData.status = status;
    }

    if (statusContrato) {
      const statusContratoValidos = [
        "Rascunho",
        "Pendente",
        "Para aprovação",
        "Aprovado",
        "Rejeitado",
      ];
      if (!statusContratoValidos.includes(statusContrato)) {
        return res.status(400).json({
          message: "Status de contrato inválido",
          statusValidos: statusContratoValidos,
        });
      }
      updateData.statusContrato = statusContrato;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Nenhum status fornecido para atualização",
      });
    }

    const contratoAtualizado = await Contrato.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!contratoAtualizado) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contratoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar status do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos/:id/medicoes - Adicionar medição ao contrato
router.post("/:id/medicoes", async (req, res) => {
  try {
    const { id } = req.params;
    const medicaoData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Gerar ID para a medição se não existir
    if (!medicaoData.id) {
      medicaoData.id = generateUUID();
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    // Adicionar medição
    contrato.medicoes.push(medicaoData);

    // As medições são armazenadas no array medicoes do contrato
    // O progresso das obras é calculado baseado nas medições
    console.log("Medição adicionada ao contrato:", medicaoData.id);

    // Atualizar status do contrato se necessário
    if (contrato.status === "A iniciar") {
      contrato.status = "Em Andamento";
    }

    const contratoAtualizado = await contrato.save();

    res.status(201).json(contratoAtualizado);
  } catch (error) {
    console.error("Erro ao adicionar medição:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/medicoes - Listar medições do contrato
router.get("/:id/medicoes", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select("medicoes");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contrato.medicoes);
  } catch (error) {
    console.error("Erro ao buscar medições:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// DELETE /api/contratos/:id - Excluir contrato
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contratoExcluido = await Contrato.findByIdAndDelete(id);

    if (!contratoExcluido) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json({ message: "Contrato excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/obras - Listar obras do contrato (via obrasRef)
router.get("/:id/obras", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id)
      .select("obrasRef")
      .populate("obrasRef");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contrato.obrasRef);
  } catch (error) {
    console.error("Erro ao buscar obras do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/insumos - Listar insumos do contrato (via itens)
router.get("/:id/insumos", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select("itens");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    // Extrair todos os insumos dos itens
    const insumos = [];
    contrato.itens.forEach((item) => {
      if (item.insumos) {
        insumos.push(...item.insumos);
      }
    });

    res.json(insumos);
  } catch (error) {
    console.error("Erro ao buscar insumos do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/composicoes - Listar composições do contrato (via itens)
router.get("/:id/composicoes", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select("itens");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    // Extrair todas as composições dos itens
    const composicoes = [];
    contrato.itens.forEach((item) => {
      if (item.composicoes) {
        composicoes.push(...item.composicoes);
      }
    });

    res.json(composicoes);
  } catch (error) {
    console.error("Erro ao buscar composições do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos/import - Importar contratos em lote
router.post("/import", async (req, res) => {
  try {
    const contratos = req.body;

    if (!Array.isArray(contratos)) {
      return res
        .status(400)
        .json({ message: "Dados inválidos. Esperado array de contratos." });
    }

    // Processar cada contrato
    const contratosProcessados = contratos.map((contrato) => {
      // Validar referências polimórficas
      if (
        contrato.contratanteRef &&
        contrato.contratanteRef.id &&
        contrato.contratanteRef.model
      ) {
        console.log("Contratante será hidratado automaticamente pelo modelo");
      }

      if (contrato.empreiteiroRef && contrato.empreiteiroRef.id) {
        console.log("Empreiteiro será hidratado automaticamente pelo modelo");
      }

      return contrato;
    });

    const contratosSalvos = await Contrato.insertMany(contratosProcessados);

    res.status(201).json({
      message: `${contratosSalvos.length} contratos importados com sucesso`,
      contratos: contratosSalvos,
    });
  } catch (error) {
    console.error("Erro ao importar contratos:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Dados inválidos",
        errors,
      });
    }

    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// Função para gerar hash da assinatura
const generateSignatureHash = (assinatura, dadosSeguranca) => {
  const data = `${assinatura}-${dadosSeguranca.ip}-${
    dadosSeguranca.userAgent
  }-${new Date().toISOString()}`;
  return crypto.createHash("sha256").update(data).digest("hex");
};

// Função para capturar dados de segurança da requisição
const captureSecurityData = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0]
    : req.connection.remoteAddress || req.socket.remoteAddress;

  return {
    ip: ip,
    userAgent: req.headers["user-agent"] || "",
    timestamp: new Date(),
  };
};

// POST /api/contratos/:id/assinatura/contratante - Assinar como contratante
router.post("/:id/assinatura/contratante", async (req, res) => {
  try {
    const { id } = req.params;
    const { assinatura, localizacao, dispositivo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (!assinatura) {
      return res.status(400).json({ message: "Assinatura é obrigatória" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    // Verificar se já foi assinado pelo contratante
    if (contrato.assinaturaDigital?.contratante?.assinado) {
      return res
        .status(400)
        .json({ message: "Contrato já foi assinado pelo contratante" });
    }

    // Capturar dados de segurança
    const dadosSeguranca = captureSecurityData(req);
    dadosSeguranca.localizacao = localizacao || {};
    dadosSeguranca.dispositivo = dispositivo || {};

    // Gerar hash da assinatura
    const hashAssinatura = generateSignatureHash(assinatura, dadosSeguranca);

    // Assinar como contratante
    await contrato.assinarContratante(
      { assinatura, hash: hashAssinatura },
      dadosSeguranca
    );

    res.json({
      message: "Contrato assinado com sucesso pelo contratante",
      statusAssinatura: contrato.getStatusAssinatura(),
      assinadoCompletamente: contrato.assinadoCompletamente,
    });
  } catch (error) {
    console.error("Erro ao assinar contrato como contratante:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos/:id/assinatura/empreiteiro - Assinar como empreiteiro
router.post("/:id/assinatura/empreiteiro", async (req, res) => {
  try {
    const { id } = req.params;
    const { assinatura, localizacao, dispositivo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (!assinatura) {
      return res.status(400).json({ message: "Assinatura é obrigatória" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    // Verificar se já foi assinado pelo empreiteiro
    if (contrato.assinaturaDigital?.empreiteiro?.assinado) {
      return res
        .status(400)
        .json({ message: "Contrato já foi assinado pelo empreiteiro" });
    }

    // Capturar dados de segurança
    const dadosSeguranca = captureSecurityData(req);
    dadosSeguranca.localizacao = localizacao || {};
    dadosSeguranca.dispositivo = dispositivo || {};

    // Gerar hash da assinatura
    const hashAssinatura = generateSignatureHash(assinatura, dadosSeguranca);

    // Assinar como empreiteiro
    await contrato.assinarEmpreiteiro(
      { assinatura, hash: hashAssinatura },
      dadosSeguranca
    );

    res.json({
      message: "Contrato assinado com sucesso pelo empreiteiro",
      statusAssinatura: contrato.getStatusAssinatura(),
      assinadoCompletamente: contrato.assinadoCompletamente,
    });
  } catch (error) {
    console.error("Erro ao assinar contrato como empreiteiro:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/assinatura/status - Obter status da assinatura
router.get("/:id/assinatura/status", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select(
      "assinaturaDigital status"
    );
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json({
      statusAssinatura: contrato.getStatusAssinatura(),
      contratanteAssinado: contrato.contratanteAssinado,
      empreiteiroAssinado: contrato.empreiteiroAssinado,
      assinadoCompletamente: contrato.assinadoCompletamente,
      dataAssinaturaCompleta:
        contrato.assinaturaDigital?.dataAssinaturaCompleta,
    });
  } catch (error) {
    console.error("Erro ao obter status da assinatura:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/assinatura/contratante - Obter assinatura do contratante
router.get("/:id/assinatura/contratante", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select(
      "assinaturaDigital.contratante"
    );
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (!contrato.assinaturaDigital?.contratante?.assinado) {
      return res
        .status(404)
        .json({ message: "Contratante ainda não assinou o contrato" });
    }

    res.json({
      assinado: contrato.assinaturaDigital.contratante.assinado,
      dataAssinatura: contrato.assinaturaDigital.contratante.dataAssinatura,
      assinatura: contrato.assinaturaDigital.contratante.assinatura,
      hashAssinatura:
        contrato.assinaturaDigital.contratante.dadosSeguranca?.hashAssinatura,
    });
  } catch (error) {
    console.error("Erro ao obter assinatura do contratante:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/assinatura/empreiteiro - Obter assinatura do empreiteiro
router.get("/:id/assinatura/empreiteiro", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select(
      "assinaturaDigital.empreiteiro"
    );
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (!contrato.assinaturaDigital?.empreiteiro?.assinado) {
      return res
        .status(404)
        .json({ message: "Empreiteiro ainda não assinou o contrato" });
    }

    res.json({
      assinado: contrato.assinaturaDigital.empreiteiro.assinado,
      dataAssinatura: contrato.assinaturaDigital.empreiteiro.dataAssinatura,
      assinatura: contrato.assinaturaDigital.empreiteiro.assinatura,
      hashAssinatura:
        contrato.assinaturaDigital.empreiteiro.dadosSeguranca?.hashAssinatura,
    });
  } catch (error) {
    console.error("Erro ao obter assinatura do empreiteiro:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /server/info - Obter informações do servidor para captura de dados de segurança
router.get("/server/info", async (req, res) => {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
      ? forwarded.split(",")[0]
      : req.connection.remoteAddress || req.socket.remoteAddress;

    res.json({
      ip: ip,
      userAgent: req.headers["user-agent"] || "",
      timestamp: new Date().toISOString(),
      location: {
        // Dados básicos que podem ser obtidos do servidor
        server: process.env.NODE_ENV || "development",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  } catch (error) {
    console.error("Erro ao obter informações do servidor:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/itens - Listar itens do contrato
router.get("/:id/itens", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select("itens");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contrato.itens);
  } catch (error) {
    console.error("Erro ao buscar itens do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos/:id/itens - Adicionar item ao contrato
router.post("/:id/itens", async (req, res) => {
  try {
    const { id } = req.params;
    const itemData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    contrato.itens.push(itemData);
    const contratoAtualizado = await contrato.save();

    res
      .status(201)
      .json(contratoAtualizado.itens[contratoAtualizado.itens.length - 1]);
  } catch (error) {
    console.error("Erro ao adicionar item ao contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PUT /api/contratos/:id/itens/:itemIndex - Atualizar item do contrato
router.put("/:id/itens/:itemIndex", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const itemData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    contrato.itens[index] = { ...contrato.itens[index], ...itemData };
    const contratoAtualizado = await contrato.save();

    res.json(contratoAtualizado.itens[index]);
  } catch (error) {
    console.error("Erro ao atualizar item do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// DELETE /api/contratos/:id/itens/:itemIndex - Remover item do contrato
router.delete("/:id/itens/:itemIndex", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    contrato.itens.splice(index, 1);
    await contrato.save();

    res.json({ message: "Item removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover item do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/assinatura/verificar - Verificar se contrato pode ser assinado
router.get("/:id/assinatura/verificar", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select(
      "assinaturaDigital status contratante empreiteiro"
    );
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    // Verificar se o contrato tem todos os dados necessários para assinatura
    const podeAssinar = {
      contratante: {
        temDados: !!(contrato.contratante && contrato.contratante.nome),
        jaAssinado: contrato.assinaturaDigital?.contratante?.assinado || false,
      },
      empreiteiro: {
        temDados: !!(contrato.empreiteiro && contrato.empreiteiro.nome),
        jaAssinado: contrato.assinaturaDigital?.empreiteiro?.assinado || false,
      },
    };

    res.json({
      podeAssinar: podeAssinar,
      statusAssinatura: contrato.getStatusAssinatura(),
      assinadoCompletamente: contrato.assinadoCompletamente,
    });
  } catch (error) {
    console.error("Erro ao verificar assinatura:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// ============================================================
// ROTAS GRANULARES PARA GERENCIAR ITENS, INSUMOS E COMPOSIÇÕES
// ============================================================

// POST /api/contratos/:id/itens/:itemIndex/item - Adicionar item individual ao grupo
router.post("/:id/itens/:itemIndex/item", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const itemData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    if (!contrato.itens[index].item) {
      contrato.itens[index].item = [];
    }

    contrato.itens[index].item.push(itemData);
    const contratoAtualizado = await contrato.save();

    res.status(201).json({
      message: "Item adicionado com sucesso",
      item: contrato.itens[index].item[contrato.itens[index].item.length - 1],
      grupo: contratoAtualizado.itens[index],
    });
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PUT /api/contratos/:id/itens/:itemIndex/item/:itemId - Atualizar item individual
router.put("/:id/itens/:itemIndex/item/:itemId", async (req, res) => {
  try {
    const { id, itemIndex, itemId } = req.params;
    const itemData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    const itemIdInt = parseInt(itemId);

    if (isNaN(index) || index < 0 || isNaN(itemIdInt) || itemIdInt < 0) {
      return res.status(400).json({ message: "Índices inválidos" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    if (
      !contrato.itens[index].item ||
      itemIdInt >= contrato.itens[index].item.length
    ) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    contrato.itens[index].item[itemIdInt] = {
      ...contrato.itens[index].item[itemIdInt],
      ...itemData,
    };

    const contratoAtualizado = await contrato.save();

    res.json({
      message: "Item atualizado com sucesso",
      item: contratoAtualizado.itens[index].item[itemIdInt],
      grupo: contratoAtualizado.itens[index],
    });
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// DELETE /api/contratos/:id/itens/:itemIndex/item/:itemId - Remover item individual
router.delete("/:id/itens/:itemIndex/item/:itemId", async (req, res) => {
  try {
    const { id, itemIndex, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    const itemIdInt = parseInt(itemId);

    if (isNaN(index) || index < 0 || isNaN(itemIdInt) || itemIdInt < 0) {
      return res.status(400).json({ message: "Índices inválidos" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    if (
      !contrato.itens[index].item ||
      itemIdInt >= contrato.itens[index].item.length
    ) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    contrato.itens[index].item.splice(itemIdInt, 1);
    await contrato.save();

    res.json({ message: "Item removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover item:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos/:id/itens/:itemIndex/insumos - Adicionar insumo ao grupo
router.post("/:id/itens/:itemIndex/insumos", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const insumoData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    if (!contrato.itens[index].insumos) {
      contrato.itens[index].insumos = [];
    }

    contrato.itens[index].insumos.push(insumoData);
    const contratoAtualizado = await contrato.save();

    res.status(201).json({
      message: "Insumo adicionado com sucesso",
      insumo:
        contrato.itens[index].insumos[contrato.itens[index].insumos.length - 1],
      grupo: contratoAtualizado.itens[index],
    });
  } catch (error) {
    console.error("Erro ao adicionar insumo:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PUT /api/contratos/:id/itens/:itemIndex/insumos/:insumoId - Atualizar insumo
router.put("/:id/itens/:itemIndex/insumos/:insumoId", async (req, res) => {
  try {
    const { id, itemIndex, insumoId } = req.params;
    const insumoData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    const insumoIdInt = parseInt(insumoId);

    if (isNaN(index) || index < 0 || isNaN(insumoIdInt) || insumoIdInt < 0) {
      return res.status(400).json({ message: "Índices inválidos" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    if (
      !contrato.itens[index].insumos ||
      insumoIdInt >= contrato.itens[index].insumos.length
    ) {
      return res.status(404).json({ message: "Insumo não encontrado" });
    }

    contrato.itens[index].insumos[insumoIdInt] = {
      ...contrato.itens[index].insumos[insumoIdInt],
      ...insumoData,
    };

    const contratoAtualizado = await contrato.save();

    res.json({
      message: "Insumo atualizado com sucesso",
      insumo: contratoAtualizado.itens[index].insumos[insumoIdInt],
      grupo: contratoAtualizado.itens[index],
    });
  } catch (error) {
    console.error("Erro ao atualizar insumo:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// DELETE /api/contratos/:id/itens/:itemIndex/insumos/:insumoId - Remover insumo
router.delete("/:id/itens/:itemIndex/insumos/:insumoId", async (req, res) => {
  try {
    const { id, itemIndex, insumoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    const insumoIdInt = parseInt(insumoId);

    if (isNaN(index) || index < 0 || isNaN(insumoIdInt) || insumoIdInt < 0) {
      return res.status(400).json({ message: "Índices inválidos" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    if (
      !contrato.itens[index].insumos ||
      insumoIdInt >= contrato.itens[index].insumos.length
    ) {
      return res.status(404).json({ message: "Insumo não encontrado" });
    }

    contrato.itens[index].insumos.splice(insumoIdInt, 1);
    await contrato.save();

    res.json({ message: "Insumo removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover insumo:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos/:id/itens/:itemIndex/composicoes - Adicionar composição ao grupo
router.post("/:id/itens/:itemIndex/composicoes", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const composicaoData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    if (!contrato.itens[index].composicoes) {
      contrato.itens[index].composicoes = [];
    }

    contrato.itens[index].composicoes.push(composicaoData);
    const contratoAtualizado = await contrato.save();

    res.status(201).json({
      message: "Composição adicionada com sucesso",
      composicao:
        contrato.itens[index].composicoes[
          contrato.itens[index].composicoes.length - 1
        ],
      grupo: contratoAtualizado.itens[index],
    });
  } catch (error) {
    console.error("Erro ao adicionar composição:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PUT /api/contratos/:id/itens/:itemIndex/composicoes/:composicaoId - Atualizar composição
router.put(
  "/:id/itens/:itemIndex/composicoes/:composicaoId",
  async (req, res) => {
    try {
      const { id, itemIndex, composicaoId } = req.params;
      const composicaoData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const index = parseInt(itemIndex);
      const composicaoIdInt = parseInt(composicaoId);

      if (
        isNaN(index) ||
        index < 0 ||
        isNaN(composicaoIdInt) ||
        composicaoIdInt < 0
      ) {
        return res.status(400).json({ message: "Índices inválidos" });
      }

      const contrato = await Contrato.findById(id);
      if (!contrato) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }

      if (index >= contrato.itens.length) {
        return res
          .status(404)
          .json({ message: "Grupo de itens não encontrado" });
      }

      if (
        !contrato.itens[index].composicoes ||
        composicaoIdInt >= contrato.itens[index].composicoes.length
      ) {
        return res.status(404).json({ message: "Composição não encontrada" });
      }

      contrato.itens[index].composicoes[composicaoIdInt] = {
        ...contrato.itens[index].composicoes[composicaoIdInt],
        ...composicaoData,
      };

      const contratoAtualizado = await contrato.save();

      res.json({
        message: "Composição atualizada com sucesso",
        composicao:
          contratoAtualizado.itens[index].composicoes[composicaoIdInt],
        grupo: contratoAtualizado.itens[index],
      });
    } catch (error) {
      console.error("Erro ao atualizar composição:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }
);

// DELETE /api/contratos/:id/itens/:itemIndex/composicoes/:composicaoId - Remover composição
router.delete(
  "/:id/itens/:itemIndex/composicoes/:composicaoId",
  async (req, res) => {
    try {
      const { id, itemIndex, composicaoId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const index = parseInt(itemIndex);
      const composicaoIdInt = parseInt(composicaoId);

      if (
        isNaN(index) ||
        index < 0 ||
        isNaN(composicaoIdInt) ||
        composicaoIdInt < 0
      ) {
        return res.status(400).json({ message: "Índices inválidos" });
      }

      const contrato = await Contrato.findById(id);
      if (!contrato) {
        return res.status(404).json({ message: "Contrato não encontrado" });
      }

      if (index >= contrato.itens.length) {
        return res
          .status(404)
          .json({ message: "Grupo de itens não encontrado" });
      }

      if (
        !contrato.itens[index].composicoes ||
        composicaoIdInt >= contrato.itens[index].composicoes.length
      ) {
        return res.status(404).json({ message: "Composição não encontrada" });
      }

      contrato.itens[index].composicoes.splice(composicaoIdInt, 1);
      await contrato.save();

      res.json({ message: "Composição removida com sucesso" });
    } catch (error) {
      console.error("Erro ao remover composição:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }
);

// PUT /api/contratos/:id/itens - Atualizar todos os itens do contrato (útil para edição em lote)
router.put("/:id/itens", async (req, res) => {
  try {
    const { id } = req.params;
    const { itens } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (!Array.isArray(itens)) {
      return res.status(400).json({ message: "Itens deve ser um array" });
    }

    const contrato = await Contrato.findById(id);
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    contrato.itens = itens;
    const contratoAtualizado = await contrato.save();

    res.json({
      message: "Itens atualizados com sucesso",
      itens: contratoAtualizado.itens,
    });
  } catch (error) {
    console.error("Erro ao atualizar itens:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/itens/:itemIndex/item - Listar itens individuais de um grupo
router.get("/:id/itens/:itemIndex/item", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id).select("itens");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    res.json(contrato.itens[index].item || []);
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/itens/:itemIndex/insumos - Listar insumos de um grupo
router.get("/:id/itens/:itemIndex/insumos", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id).select("itens");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    res.json(contrato.itens[index].insumos || []);
  } catch (error) {
    console.error("Erro ao buscar insumos:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/itens/:itemIndex/composicoes - Listar composições de um grupo
router.get("/:id/itens/:itemIndex/composicoes", async (req, res) => {
  try {
    const { id, itemIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ message: "Índice do item inválido" });
    }

    const contrato = await Contrato.findById(id).select("itens");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    if (index >= contrato.itens.length) {
      return res.status(404).json({ message: "Grupo de itens não encontrado" });
    }

    res.json(contrato.itens[index].composicoes || []);
  } catch (error) {
    console.error("Erro ao buscar composições:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
