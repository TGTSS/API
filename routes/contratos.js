import express from "express";
import Contrato from "../models/Contrato.js";
import mongoose from "mongoose";

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
      filters.status = status;
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
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

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

    // Calcular valor executado total
    const contratosComProgresso = await Contrato.find({
      status: { $in: ["Em Andamento", "Concluído"] },
    }).lean();

    const valorExecutado = contratosComProgresso.reduce((acc, contrato) => {
      const valorExecutadoContrato = contrato.obras.reduce((sum, obra) => {
        return sum + obra.valorContrato * (obra.progresso / 100);
      }, 0);
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

    // Gerar endereços das obras se não existirem
    if (contratoData.obras && contratoData.obras.length > 0) {
      contratoData.enderecosObras = contratoData.obras.map((obra) => {
        if (obra.endereco && typeof obra.endereco === "object") {
          const endereco = obra.endereco;
          return `${endereco.logradouro || ""}${
            endereco.numero ? `, ${endereco.numero}` : ""
          }${endereco.complemento ? `, ${endereco.complemento}` : ""}${
            endereco.bairro ? `, ${endereco.bairro}` : ""
          }${endereco.cidade ? `, ${endereco.cidade}` : ""}${
            endereco.estado ? ` - ${endereco.estado}` : ""
          }${endereco.cep ? `, CEP: ${endereco.cep}` : ""}`
            .replace(/^,\s*/, "")
            .trim();
        }
        return obra.endereco || "";
      });
    }

    // Garantir que as obras tenham progresso inicializado
    if (contratoData.obras) {
      contratoData.obras = contratoData.obras.map((obra) => ({
        ...obra,
        progresso: obra.progresso || 0,
      }));
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

    // Gerar endereços das obras se não existirem
    if (contratoData.obras && contratoData.obras.length > 0) {
      contratoData.enderecosObras = contratoData.obras.map((obra) => {
        if (obra.endereco && typeof obra.endereco === "object") {
          const endereco = obra.endereco;
          return `${endereco.logradouro || ""}${
            endereco.numero ? `, ${endereco.numero}` : ""
          }${endereco.complemento ? `, ${endereco.complemento}` : ""}${
            endereco.bairro ? `, ${endereco.bairro}` : ""
          }${endereco.cidade ? `, ${endereco.cidade}` : ""}${
            endereco.estado ? ` - ${endereco.estado}` : ""
          }${endereco.cep ? `, CEP: ${endereco.cep}` : ""}`
            .replace(/^,\s*/, "")
            .trim();
        }
        return obra.endereco || "";
      });
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
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const statusValidos = [
      "A iniciar",
      "Em Andamento",
      "Concluído",
      "Suspenso",
      "Cancelado",
    ];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        message: "Status inválido",
        statusValidos,
      });
    }

    const contratoAtualizado = await Contrato.findByIdAndUpdate(
      id,
      { status },
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

    // Atualizar progresso das obras baseado na medição
    if (medicaoData.medicoesPorObra) {
      medicaoData.medicoesPorObra.forEach((medicaoObra) => {
        const obra = contrato.obras.find((o) => o.id === medicaoObra.obraId);
        if (obra) {
          obra.progresso = medicaoObra.percentualExecutado;
        }
      });
    }

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

// GET /api/contratos/:id/obras - Listar obras do contrato
router.get("/:id/obras", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select("obras");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contrato.obras);
  } catch (error) {
    console.error("Erro ao buscar obras do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/insumos - Listar insumos do contrato
router.get("/:id/insumos", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select("insumos");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contrato.insumos);
  } catch (error) {
    console.error("Erro ao buscar insumos do contrato:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos/:id/composicoes - Listar composições do contrato
router.get("/:id/composicoes", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const contrato = await Contrato.findById(id).select("composicoes");
    if (!contrato) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(contrato.composicoes);
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
      // Gerar endereços das obras se não existirem
      if (contrato.obras && contrato.obras.length > 0) {
        contrato.enderecosObras = contrato.obras.map((obra) => {
          if (obra.endereco && typeof obra.endereco === "object") {
            const endereco = obra.endereco;
            return `${endereco.logradouro || ""}${
              endereco.numero ? `, ${endereco.numero}` : ""
            }${endereco.complemento ? `, ${endereco.complemento}` : ""}${
              endereco.bairro ? `, ${endereco.bairro}` : ""
            }${endereco.cidade ? `, ${endereco.cidade}` : ""}${
              endereco.estado ? ` - ${endereco.estado}` : ""
            }${endereco.cep ? `, CEP: ${endereco.cep}` : ""}`
              .replace(/^,\s*/, "")
              .trim();
          }
          return obra.endereco || "";
        });
      }

      // Garantir que as obras tenham progresso inicializado
      if (contrato.obras) {
        contrato.obras = contrato.obras.map((obra) => ({
          ...obra,
          progresso: obra.progresso || 0,
        }));
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

export default router;
