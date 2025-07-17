import express from "express";
import Inventario from "../models/Inventario.js";
import Obra from "../models/Obra.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configuração do multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "inventario"
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// GET - Listar todos os itens do inventário
router.get("/", async (req, res) => {
  try {
    const {
      search,
      categoria,
      subcategoria,
      status,
      obra,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Construir filtros
    const filtros = {};

    if (search) {
      filtros.$or = [
        { nome: { $regex: search, $options: "i" } },
        { codigo: { $regex: search, $options: "i" } },
        { descricao: { $regex: search, $options: "i" } },
        { marca: { $regex: search, $options: "i" } },
        { modelo: { $regex: search, $options: "i" } },
        { subcategoria: { $regex: search, $options: "i" } },
      ];
    }

    if (categoria && categoria !== "all") {
      filtros.categoria = categoria;
    }

    if (subcategoria && subcategoria !== "all") {
      filtros.subcategoria = subcategoria;
    }

    if (status && status !== "all") {
      filtros.status = status;
    }

    if (obra && obra !== "all") {
      filtros.obraAtual = obra;
    }

    // Configurar ordenação
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calcular paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Executar consulta
    const itens = await Inventario.find(filtros)
      .populate("obraAtual", "nome codigo")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Contar total de documentos
    const total = await Inventario.countDocuments(filtros);

    // Calcular quantidade disponível para cada item
    const itensComQuantidadeDisponivel = itens.map((item) => {
      const quantidadeAlocada =
        item.alocacoes
          ?.filter((alocacao) => alocacao.status === "ativa")
          .reduce((total, alocacao) => total + alocacao.quantidade, 0) || 0;

      return {
        ...item,
        quantidadeDisponivel: item.quantidade - quantidadeAlocada,
      };
    });

    res.json({
      itens: itensComQuantidadeDisponivel,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar itens do inventário:", error);
    res.status(500).json({
      message: "Erro ao buscar itens do inventário",
      error: error.message,
    });
  }
});

// GET - Buscar item por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventario.findById(id)
      .populate("obraAtual", "nome codigo")
      .populate("alocacoes.obra", "nome codigo")
      .lean();

    if (!item) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    // Calcular quantidade disponível
    const quantidadeAlocada =
      item.alocacoes
        ?.filter((alocacao) => alocacao.status === "ativa")
        .reduce((total, alocacao) => total + alocacao.quantidade, 0) || 0;

    const itemComQuantidadeDisponivel = {
      ...item,
      quantidadeDisponivel: item.quantidade - quantidadeAlocada,
    };

    res.json(itemComQuantidadeDisponivel);
  } catch (error) {
    console.error("Erro ao buscar item:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar item", error: error.message });
  }
});

// POST - Criar novo item
router.post("/", async (req, res) => {
  try {
    const dadosItem = req.body;

    // Verificar se código já existe
    if (dadosItem.codigo) {
      const itemExistente = await Inventario.findOne({
        codigo: dadosItem.codigo,
      });
      if (itemExistente) {
        return res
          .status(400)
          .json({ message: "Código já existe no inventário" });
      }
    }

    // Criar novo item
    const novoItem = new Inventario({
      ...dadosItem,
      historico: [
        {
          tipo: "criacao",
          descricao: "Item criado no inventário",
          usuario: dadosItem.usuario || "Sistema",
          dadosNovos: dadosItem,
        },
      ],
    });

    const itemSalvo = await novoItem.save();

    // Popular dados da obra se houver
    if (itemSalvo.obraAtual) {
      await itemSalvo.populate("obraAtual", "nome codigo");
    }

    res.status(201).json(itemSalvo);
  } catch (error) {
    console.error("Erro ao criar item:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar item", error: error.message });
  }
});

// PUT - Atualizar item
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const dadosAtualizacao = req.body;

    // Buscar item atual
    const itemAtual = await Inventario.findById(id);
    if (!itemAtual) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    // Verificar se código já existe (se foi alterado)
    if (
      dadosAtualizacao.codigo &&
      dadosAtualizacao.codigo !== itemAtual.codigo
    ) {
      const itemExistente = await Inventario.findOne({
        codigo: dadosAtualizacao.codigo,
        _id: { $ne: id },
      });
      if (itemExistente) {
        return res
          .status(400)
          .json({ message: "Código já existe no inventário" });
      }
    }

    // Salvar dados anteriores para histórico
    const dadosAnteriores = itemAtual.toObject();

    // Atualizar item
    Object.assign(itemAtual, dadosAtualizacao);

    // Adicionar entrada no histórico
    itemAtual.historico.push({
      tipo: "edicao",
      descricao: "Item atualizado no inventário",
      usuario: dadosAtualizacao.usuario || "Sistema",
      dadosAnteriores,
      dadosNovos: dadosAtualizacao,
    });

    const itemAtualizado = await itemAtual.save();

    // Popular dados da obra se houver
    if (itemAtualizado.obraAtual) {
      await itemAtualizado.populate("obraAtual", "nome codigo");
    }

    res.json(itemAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar item", error: error.message });
  }
});

// DELETE - Excluir item
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventario.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    // Verificar se há alocações ativas
    const alocacoesAtivas = item.alocacoes.filter((a) => a.status === "ativa");
    if (alocacoesAtivas.length > 0) {
      return res.status(400).json({
        message: "Não é possível excluir item com alocações ativas",
        alocacoesAtivas: alocacoesAtivas.length,
      });
    }

    await Inventario.findByIdAndDelete(id);
    res.json({ message: "Item excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir item:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir item", error: error.message });
  }
});

// POST - Alocar item para obra (com upload de arquivos)
router.post(
  "/:id/alocar",
  upload.fields([
    { name: "foto", maxCount: 5 },
    { name: "assinaturaResponsavel", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      // Os outros campos virão em req.body
      const dadosAlocacao = req.body;

      // Processar arquivos enviados
      const fotos =
        req.files && req.files["foto"]
          ? req.files["foto"].map((file) => ({
              nome: file.originalname,
              tipo: file.mimetype,
              tamanho: file.size,
              caminho: `/api/inventario/uploads/${file.filename}`,
              dataUpload: new Date(),
            }))
          : [];

      const assinatura =
        req.files && req.files["assinaturaResponsavel"]
          ? {
              nome: req.files["assinaturaResponsavel"][0].originalname,
              tipo: req.files["assinaturaResponsavel"][0].mimetype,
              tamanho: req.files["assinaturaResponsavel"][0].size,
              caminho: `/api/inventario/uploads/${req.files["assinaturaResponsavel"][0].filename}`,
              dataUpload: new Date(),
            }
          : null;

      // Adicione as fotos e assinatura ao objeto de alocação
      dadosAlocacao.fotos = fotos;
      dadosAlocacao.assinaturaResponsavel = assinatura;

      // Converter quantidade para número
      if (dadosAlocacao.quantidade) {
        dadosAlocacao.quantidade = parseFloat(dadosAlocacao.quantidade);
      }

      const item = await Inventario.findById(id);
      if (!item) {
        return res.status(404).json({ message: "Item não encontrado" });
      }

      // Verificar se obra existe
      const obra = await Obra.findById(dadosAlocacao.obra);
      if (!obra) {
        return res.status(404).json({ message: "Obra não encontrada" });
      }

      // Verificar se pode ser alocado
      if (!item.podeSerAlocado(dadosAlocacao.quantidade)) {
        return res.status(400).json({
          message: "Quantidade insuficiente para alocação",
          quantidadeDisponivel: item.getQuantidadeDisponivel(),
          quantidadeSolicitada: dadosAlocacao.quantidade,
        });
      }

      // Alocar item (agora com fotos e assinatura)
      await item.alocarItem(dadosAlocacao);

      // Adicionar entrada no histórico
      item.historico.push({
        tipo: "alocacao",
        descricao: `Item alocado para obra: ${obra.nome}`,
        usuario: dadosAlocacao.usuario || "Sistema",
        dadosNovos: dadosAlocacao,
      });

      await item.save();

      // Popular dados da obra
      await item.populate("obraAtual", "nome codigo");
      await item.populate("alocacoes.obra", "nome codigo");

      res.json(item);
    } catch (error) {
      console.error("Erro ao alocar item:", error);
      res
        .status(500)
        .json({ message: "Erro ao alocar item", error: error.message });
    }
  }
);

// PUT - Devolver item
router.put("/:id/devolver/:alocacaoId", async (req, res) => {
  try {
    const { id, alocacaoId } = req.params;
    const dadosDevolucao = req.body;

    const item = await Inventario.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    // Devolver item
    await item.devolverItem(alocacaoId, dadosDevolucao);

    // Adicionar entrada no histórico
    item.historico.push({
      tipo: "devolucao",
      descricao: "Item devolvido da obra",
      usuario: dadosDevolucao.usuario || "Sistema",
      dadosNovos: dadosDevolucao,
    });

    await item.save();

    // Popular dados da obra
    await item.populate("obraAtual", "nome codigo");
    await item.populate("alocacoes.obra", "nome codigo");

    res.json(item);
  } catch (error) {
    console.error("Erro ao devolver item:", error);
    res
      .status(500)
      .json({ message: "Erro ao devolver item", error: error.message });
  }
});

// GET - Estatísticas do inventário
router.get("/stats/geral", async (req, res) => {
  try {
    const [
      totalItens,
      itensPorCategoria,
      itensPorStatus,
      itensAlocados,
      valorTotal,
    ] = await Promise.all([
      Inventario.countDocuments(),
      Inventario.aggregate([
        { $group: { _id: "$categoria", count: { $sum: 1 } } },
      ]),
      Inventario.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Inventario.countDocuments({ "alocacoes.status": "ativa" }),
      Inventario.aggregate([
        { $match: { valorUnitario: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$valorUnitario", "$quantidade"] } },
          },
        },
      ]),
    ]);

    res.json({
      totalItens,
      itensPorCategoria: itensPorCategoria.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      itensPorStatus: itensPorStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      itensAlocados,
      valorTotal: valorTotal[0]?.total || 0,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar estatísticas", error: error.message });
  }
});

// GET - Itens por obra
router.get("/obra/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;

    const itens = await Inventario.find({
      $or: [
        { obraAtual: obraId },
        { "alocacoes.obra": obraId, "alocacoes.status": "ativa" },
      ],
    })
      .populate("obraAtual", "nome codigo")
      .populate("alocacoes.obra", "nome codigo")
      .lean();

    // Calcular quantidade disponível para cada item
    const itensComQuantidadeDisponivel = itens.map((item) => {
      const quantidadeAlocada =
        item.alocacoes
          ?.filter((alocacao) => alocacao.status === "ativa")
          .reduce((total, alocacao) => total + alocacao.quantidade, 0) || 0;

      return {
        ...item,
        quantidadeDisponivel: item.quantidade - quantidadeAlocada,
      };
    });

    res.json(itensComQuantidadeDisponivel);
  } catch (error) {
    console.error("Erro ao buscar itens da obra:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar itens da obra", error: error.message });
  }
});

// GET - Histórico de um item
router.get("/:id/historico", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventario.findById(id).select("historico");
    if (!item) {
      return res.status(404).json({ message: "Item não encontrado" });
    }

    res.json(item.historico);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar histórico", error: error.message });
  }
});

// POST - Importar itens em lote
router.post("/import", async (req, res) => {
  try {
    const { itens, usuario } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res
        .status(400)
        .json({ message: "Dados inválidos para importação" });
    }

    const itensProcessados = [];
    const erros = [];

    for (let i = 0; i < itens.length; i++) {
      try {
        const itemData = itens[i];

        // Verificar se código já existe
        if (itemData.codigo) {
          const itemExistente = await Inventario.findOne({
            codigo: itemData.codigo,
          });
          if (itemExistente) {
            erros.push({
              linha: i + 1,
              codigo: itemData.codigo,
              erro: "Código já existe no inventário",
            });
            continue;
          }
        }

        // Criar item
        const novoItem = new Inventario({
          ...itemData,
          historico: [
            {
              tipo: "criacao",
              descricao: "Item importado em lote",
              usuario: usuario || "Sistema",
              dadosNovos: itemData,
            },
          ],
        });

        const itemSalvo = await novoItem.save();
        itensProcessados.push(itemSalvo);
      } catch (error) {
        erros.push({
          linha: i + 1,
          codigo: itens[i].codigo || "N/A",
          erro: error.message,
        });
      }
    }

    res.json({
      message: `Importação concluída. ${itensProcessados.length} itens importados com sucesso.`,
      itensImportados: itensProcessados.length,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro na importação:", error);
    res
      .status(500)
      .json({ message: "Erro na importação", error: error.message });
  }
});

// GET - Exportar inventário
router.get("/export", async (req, res) => {
  try {
    const { formato = "json" } = req.query;

    const itens = await Inventario.find()
      .populate("obraAtual", "nome codigo")
      .lean();

    if (formato === "csv") {
      // Implementar exportação CSV se necessário
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=inventario.csv"
      );
      // Implementar lógica de CSV
      res.send("CSV export not implemented yet");
    } else {
      res.json(itens);
    }
  } catch (error) {
    console.error("Erro na exportação:", error);
    res
      .status(500)
      .json({ message: "Erro na exportação", error: error.message });
  }
});

export default router;
