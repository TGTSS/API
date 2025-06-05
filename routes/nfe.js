import express from "express";
import NFe from "../models/NFe.js";

const router = express.Router();

// Listar todas as notas fiscais
router.get("/", async (req, res) => {
  try {
    const nfes = await NFe.find().sort({ dataEmissao: -1 });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

// Buscar uma nota fiscal específica
router.get("/:id", async (req, res) => {
  try {
    const nfe = await NFe.findById(req.params.id);
    if (!nfe) {
      return res.status(404).json({ message: "Nota fiscal não encontrada" });
    }
    res.json(nfe);
  } catch (error) {
    console.error("Erro ao buscar nota fiscal:", error);
    res.status(500).json({ message: "Erro ao buscar nota fiscal" });
  }
});

// Criar uma nova nota fiscal
router.post("/", async (req, res) => {
  try {
    // Verificar se já existe uma nota fiscal com a mesma chave de acesso
    const existingNFe = await NFe.findOne({
      chaveAcesso: req.body.chaveAcesso,
    });
    if (existingNFe) {
      return res.status(400).json({
        message: "Já existe uma nota fiscal com esta chave de acesso",
      });
    }

    const nfe = new NFe(req.body);
    const savedNFe = await nfe.save();
    res.status(201).json(savedNFe);
  } catch (error) {
    console.error("Erro ao criar nota fiscal:", error);
    res.status(500).json({ message: "Erro ao criar nota fiscal" });
  }
});

// Atualizar uma nota fiscal
router.put("/:id", async (req, res) => {
  try {
    const nfe = await NFe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!nfe) {
      return res.status(404).json({ message: "Nota fiscal não encontrada" });
    }
    res.json(nfe);
  } catch (error) {
    console.error("Erro ao atualizar nota fiscal:", error);
    res.status(500).json({ message: "Erro ao atualizar nota fiscal" });
  }
});

// Excluir uma nota fiscal
router.delete("/:id", async (req, res) => {
  try {
    const nfe = await NFe.findByIdAndDelete(req.params.id);
    if (!nfe) {
      return res.status(404).json({ message: "Nota fiscal não encontrada" });
    }
    res.json({ message: "Nota fiscal excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir nota fiscal:", error);
    res.status(500).json({ message: "Erro ao excluir nota fiscal" });
  }
});

// Buscar notas fiscais por status
router.get("/status/:status", async (req, res) => {
  try {
    const nfes = await NFe.find({ status: req.params.status }).sort({
      dataEmissao: -1,
    });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais por status:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

// Buscar notas fiscais por CNPJ do emissor
router.get("/emissor/:cnpj", async (req, res) => {
  try {
    const nfes = await NFe.find({ "issuer.cnpj": req.params.cnpj }).sort({
      dataEmissao: -1,
    });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais do emissor:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

// Buscar notas fiscais por CNPJ do destinatário
router.get("/destinatario/:cnpj", async (req, res) => {
  try {
    const nfes = await NFe.find({ "recipient.cnpj": req.params.cnpj }).sort({
      dataEmissao: -1,
    });
    res.json(nfes);
  } catch (error) {
    console.error("Erro ao buscar notas fiscais do destinatário:", error);
    res.status(500).json({ message: "Erro ao buscar notas fiscais" });
  }
});

export default router;
