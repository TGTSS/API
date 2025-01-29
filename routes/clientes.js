import express from "express";
import Cliente from "../models/Cliente.js";

const router = express.Router();

// Rota para criar um novo cliente
router.post("/", async (req, res) => {
  try {
    console.log("Rota POST /api/clientes chamada"); // Log para depuração
    console.log("Dados recebidos:", req.body); // Log para verificar os dados recebidos

    const cliente = new Cliente({
      tipo: req.body.tipo,
      tambemFornecedor: req.body.tambemFornecedor,
      status: req.body.status,
      nomeFantasia: req.body.nomeFantasia,
      razaoSocial: req.body.razaoSocial,
      cnpj: req.body.cnpj,
      inscricaoEstadual: req.body.inscricaoEstadual,
      inscricaoMunicipal: req.body.inscricaoMunicipal,
      cpf: req.body.cpf,
      nome: req.body.nome,
      telefone1: req.body.telefone1,
      email: req.body.email,
      logradouro: req.body.logradouro,
      numero: req.body.numero,
      complemento: req.body.complemento,
      bairro: req.body.bairro,
      cidade: req.body.cidade,
      estado: req.body.estado,
      cep: req.body.cep,
      contatos: req.body.contatos,
      selectedPhone: req.body.selectedPhone,
      informacoesComplementares: req.body.informacoesComplementares,
      documentos: req.body.documentos,
      segmento: req.body.segmento,
    });

    console.log("Objeto Cliente a ser salvo:", cliente); // Log para verificar o objeto Cliente

    const savedCliente = await cliente.save();
    console.log("Cliente salvo:", savedCliente); // Log para verificar o cliente salvo

    res.status(201).json(savedCliente);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(400).json({ message: error.message });
  }
});

// Rota para listar todos os clientes
router.get("/", async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar um cliente específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json(cliente);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar um cliente
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCliente = await Cliente.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedCliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json(updatedCliente);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir um cliente
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCliente = await Cliente.findByIdAndDelete(id);
    if (!deletedCliente) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.status(200).json({ message: "Cliente excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
