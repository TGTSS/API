import express from "express";
import MaterialObra from "../models/MaterialObra.js";
import Obra from "../models/Obra.js";

const router = express.Router();

// GET - Listar todos os materiais de uma obra
router.get("/obra/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { tipo, categoria, status } = req.query;

    let filtro = { obra: obraId };

    if (tipo) filtro.tipo = tipo;
    if (categoria) filtro.categoria = categoria;
    if (status) filtro.status = status;

    const materiais = await MaterialObra.find(filtro)
      .sort({ dataCadastro: -1 })
      .lean();

    res.json(materiais);
  } catch (error) {
    console.error("Erro ao buscar materiais da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Listar todos os materiais (com filtros opcionais)
router.get("/", async (req, res) => {
  try {
    const { tipo, categoria, status, obra } = req.query;

    let filtro = {};

    if (tipo) filtro.tipo = tipo;
    if (categoria) filtro.categoria = categoria;
    if (status) filtro.status = status;
    if (obra) filtro.obra = obra;

    const materiais = await MaterialObra.find(filtro)
      .populate("obra", "nome endereco")
      .sort({ dataCadastro: -1 })
      .lean();

    res.json(materiais);
  } catch (error) {
    console.error("Erro ao buscar materiais:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Buscar material por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const material = await MaterialObra.findById(id)
      .populate("obra", "nome endereco")
      .lean();

    if (!material) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    res.json(material);
  } catch (error) {
    console.error("Erro ao buscar material:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST - Criar novo material
router.post("/", async (req, res) => {
  try {
    const materialData = req.body;

    // Verificar se a obra existe
    const obra = await Obra.findById(materialData.obra);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Gerar código único se não fornecido
    if (!materialData.codigo) {
      materialData.codigo = await MaterialObra.gerarCodigo(
        materialData.categoria,
        materialData.obra
      );
    }

    // Verificar se o código já existe
    const codigoExistente = await MaterialObra.findOne({
      codigo: materialData.codigo,
      obra: materialData.obra,
    });

    if (codigoExistente) {
      return res.status(400).json({
        message: "Código já existe para esta obra",
      });
    }

    const novoMaterial = new MaterialObra(materialData);
    const materialSalvo = await novoMaterial.save();

    res.status(201).json(materialSalvo);
  } catch (error) {
    console.error("Erro ao criar material:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST - Criar material para uma obra específica
router.post("/obra/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const materialData = req.body;

    // Verificar se a obra existe
    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Adicionar a obra ao material
    materialData.obra = obraId;

    // Gerar código único se não fornecido
    if (!materialData.codigo) {
      materialData.codigo = await MaterialObra.gerarCodigo(
        materialData.categoria,
        obraId
      );
    }

    // Verificar se o código já existe
    const codigoExistente = await MaterialObra.findOne({
      codigo: materialData.codigo,
      obra: obraId,
    });

    if (codigoExistente) {
      return res.status(400).json({
        message: "Código já existe para esta obra",
      });
    }

    const novoMaterial = new MaterialObra(materialData);
    const materialSalvo = await novoMaterial.save();

    res.status(201).json(materialSalvo);
  } catch (error) {
    console.error("Erro ao criar material para obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// PUT - Atualizar material
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const materialData = req.body;

    // Verificar se o material existe
    const materialExistente = await MaterialObra.findById(id);
    if (!materialExistente) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    // Se o código foi alterado, verificar se já existe
    if (
      materialData.codigo &&
      materialData.codigo !== materialExistente.codigo
    ) {
      const codigoExistente = await MaterialObra.findOne({
        codigo: materialData.codigo,
        obra: materialExistente.obra,
        _id: { $ne: id },
      });

      if (codigoExistente) {
        return res.status(400).json({
          message: "Código já existe para esta obra",
        });
      }
    }

    const materialAtualizado = await MaterialObra.findByIdAndUpdate(
      id,
      materialData,
      { new: true }
    );

    res.json(materialAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar material:", error);
    res.status(500).json({ message: error.message });
  }
});

// PATCH - Atualizar status do material
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const material = await MaterialObra.findById(id);
    if (!material) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    material.status = status;
    const materialAtualizado = await material.save();

    res.json(materialAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar status do material:", error);
    res.status(500).json({ message: error.message });
  }
});

// PATCH - Atualizar quantidade do material
router.patch("/:id/quantidade", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade, operacao = "adicionar" } = req.body;

    const material = await MaterialObra.findById(id);
    if (!material) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    if (operacao === "adicionar") {
      material.quantidade += parseFloat(quantidade);
    } else if (operacao === "subtrair") {
      material.quantidade -= parseFloat(quantidade);
      if (material.quantidade < 0) {
        material.quantidade = 0;
      }
    } else if (operacao === "definir") {
      material.quantidade = parseFloat(quantidade);
    }

    const materialAtualizado = await material.save();

    res.json(materialAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar quantidade do material:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE - Excluir material
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const material = await MaterialObra.findByIdAndDelete(id);
    if (!material) {
      return res.status(404).json({ message: "Material não encontrado" });
    }

    res.status(200).json({ message: "Material excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir material:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Estatísticas dos materiais de uma obra
router.get("/obra/:obraId/estatisticas", async (req, res) => {
  try {
    const { obraId } = req.params;

    const estatisticas = await MaterialObra.aggregate([
      { $match: { obra: obraId } },
      {
        $group: {
          _id: null,
          totalMateriais: {
            $sum: { $cond: [{ $eq: ["$tipo", "Material"] }, 1, 0] },
          },
          totalEquipamentos: {
            $sum: { $cond: [{ $eq: ["$tipo", "Equipamento"] }, 1, 0] },
          },
          totalItens: { $sum: 1 },
          valorTotal: { $sum: "$valorTotal" },
          quantidadeTotal: { $sum: "$quantidade" },
        },
      },
    ]);

    // Estatísticas por categoria
    const categorias = await MaterialObra.aggregate([
      { $match: { obra: obraId } },
      {
        $group: {
          _id: "$categoria",
          quantidade: { $sum: 1 },
          valorTotal: { $sum: "$valorTotal" },
        },
      },
      { $sort: { quantidade: -1 } },
    ]);

    // Estatísticas por status
    const status = await MaterialObra.aggregate([
      { $match: { obra: obraId } },
      {
        $group: {
          _id: "$status",
          quantidade: { $sum: 1 },
        },
      },
    ]);

    res.json({
      geral: estatisticas[0] || {
        totalMateriais: 0,
        totalEquipamentos: 0,
        totalItens: 0,
        valorTotal: 0,
        quantidadeTotal: 0,
      },
      categorias,
      status,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Buscar materiais por código
router.get("/buscar/codigo/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { obraId } = req.query;

    let filtro = { codigo: { $regex: codigo, $options: "i" } };
    if (obraId) filtro.obra = obraId;

    const materiais = await MaterialObra.find(filtro)
      .populate("obra", "nome endereco")
      .lean();

    res.json(materiais);
  } catch (error) {
    console.error("Erro ao buscar material por código:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Buscar materiais por nome
router.get("/buscar/nome/:nome", async (req, res) => {
  try {
    const { nome } = req.params;
    const { obraId } = req.query;

    let filtro = { nome: { $regex: nome, $options: "i" } };
    if (obraId) filtro.obra = obraId;

    const materiais = await MaterialObra.find(filtro)
      .populate("obra", "nome endereco")
      .lean();

    res.json(materiais);
  } catch (error) {
    console.error("Erro ao buscar material por nome:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST - Importar materiais em lote
router.post("/importar", async (req, res) => {
  try {
    const { materiais, obraId } = req.body;

    if (!Array.isArray(materiais) || materiais.length === 0) {
      return res.status(400).json({ message: "Dados inválidos" });
    }

    // Verificar se a obra existe
    const obra = await Obra.findById(obraId);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    const materiaisProcessados = [];

    for (const materialData of materiais) {
      try {
        // Adicionar obra ao material
        materialData.obra = obraId;

        // Gerar código se não fornecido
        if (!materialData.codigo) {
          materialData.codigo = await MaterialObra.gerarCodigo(
            materialData.categoria,
            obraId
          );
        }

        // Verificar se o código já existe
        const codigoExistente = await MaterialObra.findOne({
          codigo: materialData.codigo,
          obra: obraId,
        });

        if (codigoExistente) {
          // Gerar novo código se já existir
          materialData.codigo = await MaterialObra.gerarCodigo(
            materialData.categoria,
            obraId
          );
        }

        const novoMaterial = new MaterialObra(materialData);
        const materialSalvo = await novoMaterial.save();
        materiaisProcessados.push(materialSalvo);
      } catch (error) {
        console.error(`Erro ao processar material:`, error);
        // Continuar com o próximo material
      }
    }

    res.status(201).json({
      message: `${materiaisProcessados.length} materiais importados com sucesso`,
      materiais: materiaisProcessados,
    });
  } catch (error) {
    console.error("Erro ao importar materiais:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Relatório de materiais
router.get("/relatorio/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const { tipo, categoria, status, dataInicio, dataFim } = req.query;

    let filtro = { obra: obraId };

    if (tipo) filtro.tipo = tipo;
    if (categoria) filtro.categoria = categoria;
    if (status) filtro.status = status;

    if (dataInicio || dataFim) {
      filtro.dataCadastro = {};
      if (dataInicio) filtro.dataCadastro.$gte = new Date(dataInicio);
      if (dataFim) filtro.dataCadastro.$lte = new Date(dataFim);
    }

    const materiais = await MaterialObra.find(filtro)
      .populate("obra", "nome endereco")
      .sort({ dataCadastro: -1 })
      .lean();

    // Calcular totais
    const totais = materiais.reduce(
      (acc, material) => {
        acc.quantidadeTotal += material.quantidade || 0;
        acc.valorTotal += material.valorTotal || 0;
        return acc;
      },
      { quantidadeTotal: 0, valorTotal: 0 }
    );

    res.json({
      materiais,
      totais,
      filtros: { tipo, categoria, status, dataInicio, dataFim },
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
