import express from "express";
import mongoose from "mongoose";
import ContratoReserva from "../models/ContratoReserva.js";

const router = express.Router();

// GET /api/contratos-reserva
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {};

    if (status && status !== "all") {
      filters.status = status;
    }

    if (search) {
      filters.$or = [
        { numero: { $regex: search, $options: "i" } },
        { cidade: { $regex: search, $options: "i" } },
        { estado: { $regex: search, $options: "i" } },
        { "comprador.nome": { $regex: search, $options: "i" } },
        { "imobiliaria.razaoSocial": { $regex: search, $options: "i" } },
        { "construtora.razaoSocial": { $regex: search, $options: "i" } },
      ];
    }

    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      ContratoReserva.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      ContratoReserva.countDocuments(filters),
    ]);

    res.json({
      data: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar contratos de reserva:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos-reserva/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    const doc = await ContratoReserva.findById(id);
    if (!doc)
      return res.status(404).json({ message: "Contrato não encontrado" });
    res.json(doc);
  } catch (error) {
    console.error("Erro ao buscar contrato de reserva:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// GET /api/contratos-reserva/obra/:obraId
router.get("/obra/:obraId", async (req, res) => {
  try {
    const { obraId } = req.params;
    const doc = await ContratoReserva.find({ obraRef: obraId });

    if (!doc || doc.length === 0) {
      return res.status(404).json({ message: "Contrato não encontrado" });
    }

    res.json(doc);
  } catch (error) {
    console.error("Erro ao buscar contratos de reserva por obra:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// POST /api/contratos-reserva
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    // Se vier obra ou cliente vinculados, guarde em refs úteis
    if (data.obraRef && !mongoose.Types.ObjectId.isValid(data.obraRef)) {
      data.obraRef = undefined;
    }
    if (data.clienteRef && !mongoose.Types.ObjectId.isValid(data.clienteRef)) {
      data.clienteRef = undefined;
    }

    const novo = new ContratoReserva(data);
    const salvo = await novo.save();
    res.status(201).json(salvo);
  } catch (error) {
    console.error("Erro ao criar contrato de reserva:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: "Dados inválidos", errors });
    }
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PUT /api/contratos-reserva/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    const atualizado = await ContratoReserva.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!atualizado)
      return res.status(404).json({ message: "Contrato não encontrado" });
    res.json(atualizado);
  } catch (error) {
    console.error("Erro ao atualizar contrato de reserva:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: "Dados inválidos", errors });
    }
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// PATCH /api/contratos-reserva/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    const statusValidos = ["Rascunho", "Pendente", "Finalizado", "Cancelado"];
    if (status && !statusValidos.includes(status)) {
      return res
        .status(400)
        .json({ message: "Status inválido", statusValidos });
    }
    const atualizado = await ContratoReserva.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
    if (!atualizado)
      return res.status(404).json({ message: "Contrato não encontrado" });
    res.json(atualizado);
  } catch (error) {
    console.error("Erro ao atualizar status do contrato de reserva:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

// DELETE /api/contratos-reserva/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    const removido = await ContratoReserva.findByIdAndDelete(id);
    if (!removido)
      return res.status(404).json({ message: "Contrato não encontrado" });
    res.json({ message: "Contrato de reserva excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir contrato de reserva:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
});

export default router;
