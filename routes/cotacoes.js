import express, { Router } from "express";
import Cotacao from "../models/Cotacao.js";
import Solicitacao from "../models/Solicitacao.js";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";

const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Diretório onde os arquivos serão salvos
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Rota para criar uma nova cotação
router.post("/", async (req, res) => {
  try {
    const {
      solicitacaoId,
      nome,
      descricao,
      obraId,
      obraNome,
      prioridade,
      items, // Atualizado para "items"
      status,
      data,
    } = req.body;

    // Validações
    if (!solicitacaoId || !mongoose.Types.ObjectId.isValid(solicitacaoId)) {
      return res.status(400).json({ message: "ID da solicitação inválido" });
    }

    if (!nome) {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    // Verificar se a solicitação existe
    const solicitacao = await Solicitacao.findById(solicitacaoId);
    if (!solicitacao) {
      return res.status(404).json({ message: "Solicitação não encontrada" });
    }

    // Buscar todas as cotações para obter o último número
    const cotacoes = await Cotacao.find().lean();
    const ultimoNumero = Math.max(...cotacoes.map((c) => c.numero || 0), 0);
    const proximoNumero = ultimoNumero + 1;

    const novaCotacao = new Cotacao({
      solicitacaoId,
      nome,
      descricao,
      obraId,
      obraNome,
      prioridade,
      itens: items.map((item) => ({
        descricao: item.description,
        quantidade: item.quantity,
        valor: item.unitPrice,
        _id: item._id,
      })),
      status: status || "Em cotação",
      data: data || new Date(),
      numero: proximoNumero, // Adicionado o número da cotação
    });

    const savedCotacao = await novaCotacao.save();

    // Atualizar status da solicitação para "Em cotação"
    await Solicitacao.findByIdAndUpdate(solicitacaoId, {
      status: "Em cotação",
    });

    res.status(201).json(savedCotacao);
  } catch (error) {
    console.error("Erro ao criar cotação:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar cotação", error: error.message });
  }
});

// Rota para listar todas as cotações
router.get("/", async (req, res) => {
  try {
    const cotacoes = await Cotacao.find()
      .populate("solicitacaoId", "numero status")
      .populate("obraId", "nome")
      .lean();
    res.json(cotacoes);
  } catch (error) {
    console.error("Erro ao buscar cotações:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar cotações", error: error.message });
  }
});

// Rota para obter uma cotação específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const cotacao = await Cotacao.findById(id)
      .populate("solicitacaoId", "numero status")
      .populate("obraId", "nome")
      .lean();

    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.json(cotacao);
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar cotação", error: error.message });
  }
});

// Rota para atualizar uma cotação
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const cotacaoData = req.body;
    const updatedCotacao = await Cotacao.findByIdAndUpdate(id, cotacaoData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }
    res.json(updatedCotacao);
  } catch (error) {
    console.error("Erro ao atualizar cotação:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar cotação", error: error.message });
  }
});

// Rota para excluir uma cotação
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const cotacao = await Cotacao.findById(id);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    // Atualizar status da solicitação de volta para "Pendente"
    await Solicitacao.findByIdAndUpdate(cotacao.solicitacaoId, {
      status: "Pendente",
    });

    await Cotacao.findByIdAndDelete(id);
    res.status(200).json({ message: "Cotação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir cotação:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir cotação", error: error.message });
  }
});

// Adicionar fornecedores à cotação
router.post("/:cotacaoId/fornecedores", async (req, res) => {
  try {
    const { fornecedores } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(req.params.cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    // Validar IDs dos fornecedores
    if (!Array.isArray(fornecedores) || fornecedores.length === 0) {
      return res
        .status(400)
        .json({ message: "Lista de fornecedores inválida" });
    }

    const validFornecedores = fornecedores.every((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (!validFornecedores) {
      return res.status(400).json({ message: "IDs de fornecedores inválidos" });
    }

    cotacao.fornecedores = fornecedores.map((fornecedorId) => ({
      fornecedorId,
    }));

    await cotacao.save();
    res.status(200).json(cotacao.fornecedores);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao adicionar fornecedores",
      error: error.message,
    });
  }
});

router.get("/:cotacaoId/fornecedores", async (req, res) => {
  try {
    const { cotacaoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    res.status(200).json(cotacao.fornecedores);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao buscar fornecedores da cotação",
      error: error.message,
    });
  }
});

// Remover fornecedor da cotação
router.delete("/:cotacaoId/fornecedores/:fornecedorId", async (req, res) => {
  try {
    const { cotacaoId, fornecedorId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(cotacaoId) ||
      !mongoose.Types.ObjectId.isValid(fornecedorId)
    ) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    cotacao.fornecedores = cotacao.fornecedores.filter(
      (f) => f.fornecedorId.toString() !== fornecedorId
    );

    // Remover também os itens do fornecedor
    cotacao.itensFornecedor = cotacao.itensFornecedor.filter(
      (f) => f.fornecedorId.toString() !== fornecedorId
    );

    await cotacao.save();
    res.status(200).json(cotacao.fornecedores);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao remover fornecedor", error: error.message });
  }
});

// Adicionar itens enviados por um fornecedor
router.post("/:cotacaoId/fornecedor/:fornecedorId", async (req, res) => {
  try {
    const { itens, prazoPagamento } = req.body;
    const { cotacaoId, fornecedorId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(cotacaoId) ||
      !mongoose.Types.ObjectId.isValid(fornecedorId)
    ) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    // Validar se o fornecedor está na lista de fornecedores da cotação
    const fornecedorExiste = cotacao.fornecedores.some(
      (f) => f.fornecedorId.toString() === fornecedorId
    );

    if (!fornecedorExiste) {
      return res.status(400).json({
        message: "Fornecedor não está na lista de fornecedores desta cotação",
      });
    }

    // Validar itens
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ message: "Lista de itens inválida" });
    }

    // Validar se todos os itens existem na cotação
    const itemIds = cotacao.itens.map((item) => item._id.toString());
    const itensValidos = itens.every((item) =>
      itemIds.includes(item.itemId.toString())
    );

    if (!itensValidos) {
      return res
        .status(400)
        .json({ message: "Um ou mais itens não existem na cotação" });
    }

    const fornecedorIndex = cotacao.itensFornecedor.findIndex(
      (f) => f.fornecedorId.toString() === fornecedorId
    );

    if (fornecedorIndex !== -1) {
      cotacao.itensFornecedor[fornecedorIndex].itens = itens;
      cotacao.itensFornecedor[fornecedorIndex].prazoPagamento = prazoPagamento;
    } else {
      cotacao.itensFornecedor.push({
        fornecedorId,
        itens,
        prazoPagamento,
      });
    }

    await cotacao.save();
    res.status(200).json(cotacao.itensFornecedor);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao adicionar itens", error: error.message });
  }
});

router.patch("/:cotacaoId", async (req, res) => {
  try {
    const { cotacaoId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    cotacao.status = status;
    await cotacao.save();
    res.status(200).json(cotacao);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao atualizar status da cotação",
      error: error.message,
    });
  }
});

// Atualizar valor de um item enviado por um fornecedor
router.patch(
  "/:cotacaoId/fornecedor/:fornecedorId/item/:itemId",
  async (req, res) => {
    try {
      const { cotacaoId, fornecedorId, itemId } = req.params;
      const { valor } = req.body;

      // Verificar se os IDs são válidos
      if (
        !mongoose.Types.ObjectId.isValid(cotacaoId) ||
        !mongoose.Types.ObjectId.isValid(fornecedorId) ||
        !mongoose.Types.ObjectId.isValid(itemId)
      ) {
        return res.status(400).json({ message: "IDs inválidos" });
      }

      // Buscar a cotação
      const cotacao = await Cotacao.findById(cotacaoId);
      if (!cotacao) {
        return res.status(404).json({ message: "Cotação não encontrada" });
      }

      // Verificar se o fornecedor existe na cotação
      const fornecedor = cotacao.itensFornecedor.find(
        (f) => f.fornecedorId.toString() === fornecedorId
      );
      if (!fornecedor) {
        return res
          .status(404)
          .json({ message: "Fornecedor não encontrado na cotação" });
      }

      // Verificar se o item existe para o fornecedor
      const item = fornecedor.itens.find((i) => i.itemId.toString() === itemId);
      if (!item) {
        return res
          .status(404)
          .json({ message: "Item não encontrado para o fornecedor" });
      }

      // Validar o valor recebido
      if (typeof valor !== "number" || valor <= 0) {
        return res.status(400).json({ message: "Valor inválido" });
      }

      // Atualizar o valor do item
      item.valor = valor;

      // Salvar a cotação atualizada
      await cotacao.save();
      res
        .status(200)
        .json({ message: "Valor atualizado com sucesso", cotacao });
    } catch (error) {
      console.error("Erro ao atualizar valor:", error);
      res
        .status(500)
        .json({ message: "Erro ao atualizar valor", error: error.message });
    }
  }
);

// Calcular custo total da cotação
router.get("/:cotacaoId/custo-total", async (req, res) => {
  try {
    const { cotacaoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    const totalCost = cotacao.itens.reduce((total, item) => {
      const bestPrice = cotacao.itensFornecedor
        .map((fornecedor) => {
          const itemFornecedor = fornecedor.itens.find(
            (i) => i.itemId.toString() === item._id.toString()
          );
          return itemFornecedor ? itemFornecedor.valor : null;
        })
        .filter((valor) => valor !== null)
        .reduce((min, valor) => (valor < min ? valor : min), Infinity);

      return total + (bestPrice || 0) * item.quantidade;
    }, 0);

    res.status(200).json({ totalCost });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erro ao calcular custo total", error: error.message });
  }
});

// Rota para salvar informações detalhadas com validação
router.post("/:cotacaoId/detalhes", async (req, res) => {
  try {
    const { cotacaoId } = req.params;
    const { pagamento, entrega, observacoes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    // Validações adicionais
    if (
      !pagamento ||
      !pagamento.prazo ||
      !pagamento.forma ||
      !pagamento.metodoPagamento ||
      !pagamento.parcelas
    ) {
      return res
        .status(400)
        .json({ message: "Informações de pagamento incompletas" });
    }

    if (
      !entrega ||
      !entrega.prazo ||
      !entrega.forma ||
      !entrega.endereco ||
      !entrega.endereco.rua ||
      !entrega.endereco.numero ||
      !entrega.endereco.cidade ||
      !entrega.endereco.estado ||
      !entrega.endereco.cep
    ) {
      return res
        .status(400)
        .json({ message: "Informações de entrega incompletas" });
    }

    cotacao.pagamento = pagamento;
    cotacao.entrega = entrega;
    cotacao.observacoes = observacoes || cotacao.observacoes;

    await cotacao.save();
    res
      .status(200)
      .json({ message: "Informações detalhadas salvas com sucesso", cotacao });
  } catch (error) {
    console.error("Erro ao salvar informações detalhadas:", error);
    res.status(500).json({
      message: "Erro ao salvar informações detalhadas",
      error: error.message,
    });
  }
});

// Rota para obter informações detalhadas
router.get("/:cotacaoId/detalhes", async (req, res) => {
  try {
    const { cotacaoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    res.status(200).json({
      pagamento: cotacao.pagamento,
      entrega: cotacao.entrega,
      observacoes: cotacao.observacoes,
    });
  } catch (error) {
    console.error("Erro ao obter informações detalhadas:", error);
    res.status(500).json({
      message: "Erro ao obter informações detalhadas",
      error: error.message,
    });
  }
});

// Rota para adicionar um item à cotação
router.post("/:cotacaoId/itens", async (req, res) => {
  try {
    const { cotacaoId } = req.params;
    const { descricao, quantidade, unidade, valor } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    if (!descricao || quantidade <= 0 || valor <= 0) {
      return res.status(400).json({ message: "Dados do item inválidos" });
    }

    const novoItem = { descricao, quantidade, unidade: unidade || "UN", valor };
    cotacao.itens.push(novoItem);
    await cotacao.save();

    res.status(201).json(novoItem);
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    res
      .status(500)
      .json({ message: "Erro ao adicionar item", error: error.message });
  }
});

// Rota para excluir um item da cotação
router.delete("/:cotacaoId/itens/:itemId", async (req, res) => {
  try {
    const { cotacaoId, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    cotacao.itens = cotacao.itens.filter(
      (item) => item._id.toString() !== itemId
    );
    await cotacao.save();

    res.status(200).json({ message: "Item removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover item:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover item", error: error.message });
  }
});

// Rota para atualizar um item específico da cotação
router.patch("/:cotacaoId/itens/:itemId", async (req, res) => {
  try {
    const { cotacaoId, itemId } = req.params;
    const { descricao, quantidade, unidade, valor } = req.body;

    // Verificar se os IDs são válidos
    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "ID do item inválido" });
    }

    // Buscar a cotação
    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    // Verificar se o item existe na cotação
    const item = cotacao.itens.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res
        .status(404)
        .json({ message: "Item não encontrado na cotação" });
    }

    // Validar os campos recebidos
    if (descricao !== undefined && typeof descricao !== "string") {
      return res.status(400).json({ message: "Descrição inválida" });
    }
    if (
      quantidade !== undefined &&
      (typeof quantidade !== "number" || quantidade <= 0)
    ) {
      return res.status(400).json({ message: "Quantidade inválida" });
    }
    if (unidade !== undefined && typeof unidade !== "string") {
      return res.status(400).json({ message: "Unidade inválida" });
    }
    if (valor !== undefined && (typeof valor !== "number" || valor <= 0)) {
      return res.status(400).json({ message: "Valor inválido" });
    }

    // Atualizar os campos do item
    if (descricao !== undefined) item.descricao = descricao;
    if (quantidade !== undefined) item.quantidade = quantidade;
    if (unidade !== undefined) item.unidade = unidade;
    if (valor !== undefined) item.valor = valor;

    // Salvar a cotação atualizada
    await cotacao.save();
    res.status(200).json({ message: "Item atualizado com sucesso", item });
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar item", error: error.message });
  }
});

// Rota para atualizar um item específico da cotação
router.put("/:cotacaoId/itens/:itemId", async (req, res) => {
  try {
    const { cotacaoId, itemId } = req.params;
    const { descricao, quantidade, unidade, valor } = req.body;

    // Verificar se os IDs são válidos
    if (
      !mongoose.Types.ObjectId.isValid(cotacaoId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    const item = cotacao.itens.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res
        .status(404)
        .json({ message: "Item não encontrado na cotação" });
    }

    if (descricao !== undefined) item.descricao = descricao;
    if (quantidade !== undefined && quantidade > 0)
      item.quantidade = quantidade;
    if (unidade !== undefined) item.unidade = unidade;
    if (valor !== undefined && valor > 0) item.valor = valor;

    await cotacao.save();
    res.status(200).json({ message: "Item atualizado com sucesso", item });
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar item", error: error.message });
  }
});

// Rota para listar itens de uma cotação
router.get("/:cotacaoId/itens", async (req, res) => {
  try {
    const { cotacaoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    res.status(200).json(cotacao.itens);
  } catch (error) {
    console.error("Erro ao listar itens:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar itens", error: error.message });
  }
});

// Rota para adicionar um arquivo à cotação
router.post(
  "/:cotacaoId/arquivos",
  upload.single("arquivo"),
  async (req, res) => {
    try {
      const { cotacaoId } = req.params;
      const { nome, descricao } = req.body;

      if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
        return res.status(400).json({ message: "ID da cotação inválido" });
      }

      const cotacao = await Cotacao.findById(cotacaoId);
      if (!cotacao) {
        return res.status(404).json({ message: "Cotação não encontrada" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Arquivo não enviado" });
      }

      const novoArquivo = {
        nome,
        descricao,
        caminho: req.file.path,
        tamanho: req.file.size,
      };

      cotacao.arquivos.push(novoArquivo);
      await cotacao.save();

      res.status(201).json(novoArquivo);
    } catch (error) {
      console.error("Erro ao adicionar arquivo:", error);
      res
        .status(500)
        .json({ message: "Erro ao adicionar arquivo", error: error.message });
    }
  }
);

// Rota para excluir um arquivo da cotação
router.delete("/:cotacaoId/arquivos/:arquivoId", async (req, res) => {
  try {
    const { cotacaoId, arquivoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    cotacao.arquivos = cotacao.arquivos.filter(
      (arquivo) => arquivo._id.toString() !== arquivoId
    );
    await cotacao.save();

    res.status(200).json({ message: "Arquivo removido com sucesso" });
  } catch (error) {
    console.error("Erro ao remover arquivo:", error);
    res
      .status(500)
      .json({ message: "Erro ao remover arquivo", error: error.message });
  }
});

// Rota para download de um arquivo da cotação
router.get("/:cotacaoId/arquivos/:arquivoId/download", async (req, res) => {
  try {
    const { cotacaoId, arquivoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    const arquivo = cotacao.arquivos.find(
      (arquivo) => arquivo._id.toString() === arquivoId
    );

    if (!arquivo) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }

    res.download(path.resolve(arquivo.caminho), arquivo.nome);
  } catch (error) {
    console.error("Erro ao baixar arquivo:", error);
    res
      .status(500)
      .json({ message: "Erro ao baixar arquivo", error: error.message });
  }
});

// Rota para listar arquivos de uma cotação
router.get("/:cotacaoId/arquivos", async (req, res) => {
  try {
    const { cotacaoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    res.status(200).json(cotacao.arquivos || []);
  } catch (error) {
    console.error("Erro ao buscar arquivos:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar arquivos", error: error.message });
  }
});

// Rota para buscar detalhes de um fornecedor específico
router.get("/:cotacaoId/fornecedores/:fornecedorId", async (req, res) => {
  try {
    const { cotacaoId, fornecedorId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(cotacaoId) ||
      !mongoose.Types.ObjectId.isValid(fornecedorId)
    ) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const cotacao = await Cotacao.findById(cotacaoId).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    const fornecedor = cotacao.fornecedores.find(
      (f) => f.fornecedorId.toString() === fornecedorId
    );

    if (!fornecedor) {
      return res
        .status(404)
        .json({ message: "Fornecedor não encontrado na cotação" });
    }

    res.status(200).json(fornecedor);
  } catch (error) {
    console.error("Erro ao buscar fornecedor:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar fornecedor", error: error.message });
  }
});

// Rota para atualizar informações de um fornecedor na cotação
router.patch("/:cotacaoId/fornecedores/:fornecedorId", async (req, res) => {
  try {
    const { cotacaoId, fornecedorId } = req.params;
    const { itens, prazoPagamento, prazoEntrega, desconto, condicaoPagamento } =
      req.body;

    if (
      !mongoose.Types.ObjectId.isValid(cotacaoId) ||
      !mongoose.Types.ObjectId.isValid(fornecedorId)
    ) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    const fornecedor = cotacao.fornecedores.find(
      (f) => f.fornecedorId.toString() === fornecedorId
    );

    if (!fornecedor) {
      return res
        .status(404)
        .json({ message: "Fornecedor não encontrado na cotação" });
    }

    if (itens) fornecedor.itens = itens;
    if (prazoPagamento) fornecedor.prazoPagamento = prazoPagamento;
    if (prazoEntrega) fornecedor.prazoEntrega = prazoEntrega;
    if (desconto) fornecedor.desconto = desconto;
    if (condicaoPagamento) fornecedor.condicaoPagamento = condicaoPagamento;

    await cotacao.save();
    res.status(200).json({ message: "Fornecedor atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar fornecedor", error: error.message });
  }
});

// Atualizar desconto de um fornecedor
router.patch(
  "/:cotacaoId/fornecedores/:fornecedorId/desconto",
  async (req, res) => {
    try {
      const { cotacaoId, fornecedorId } = req.params;
      const { value, type } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(cotacaoId) ||
        !mongoose.Types.ObjectId.isValid(fornecedorId)
      ) {
        return res.status(400).json({ message: "IDs inválidos" });
      }

      const cotacao = await Cotacao.findById(cotacaoId);
      if (!cotacao) {
        return res.status(404).json({ message: "Cotação não encontrada" });
      }

      const fornecedor = cotacao.fornecedores.find(
        (f) => f.fornecedorId.toString() === fornecedorId
      );
      if (!fornecedor) {
        return res
          .status(404)
          .json({ message: "Fornecedor não encontrado na cotação" });
      }

      fornecedor.desconto = {
        value: parseFloat(value) || 0,
        type: type || "percentage",
      };
      await cotacao.save();

      res
        .status(200)
        .json({ message: "Desconto atualizado com sucesso", fornecedor });
    } catch (error) {
      console.error("Erro ao atualizar desconto:", error);
      res
        .status(500)
        .json({ message: "Erro ao atualizar desconto", error: error.message });
    }
  }
);

// Atualizar desconto de um fornecedor
router.patch(
  "/:cotacaoId/fornecedor/:fornecedorId/desconto",
  async (req, res) => {
    try {
      const { cotacaoId, fornecedorId } = req.params;
      const { valor, tipo } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(cotacaoId) ||
        !mongoose.Types.ObjectId.isValid(fornecedorId)
      ) {
        return res.status(400).json({ message: "IDs inválidos" });
      }

      const cotacao = await Cotacao.findById(cotacaoId);
      if (!cotacao) {
        return res.status(404).json({ message: "Cotação não encontrada" });
      }

      const fornecedor = cotacao.fornecedores.find(
        (f) => f.fornecedorId.toString() === fornecedorId
      );
      if (!fornecedor) {
        return res
          .status(404)
          .json({ message: "Fornecedor não encontrado na cotação" });
      }

      fornecedor.desconto = {
        valor: parseFloat(valor) || 0,
        tipo: tipo || "percentage",
      };
      await cotacao.save();

      res
        .status(200)
        .json({ message: "Desconto atualizado com sucesso", fornecedor });
    } catch (error) {
      console.error("Erro ao atualizar desconto:", error);
      res
        .status(500)
        .json({ message: "Erro ao atualizar desconto", error: error.message });
    }
  }
);

// Selecionar melhores preços para itens
router.post("/:cotacaoId/selecionar-melhores-precos", async (req, res) => {
  try {
    const { cotacaoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId).lean();
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    const selectedPrices = {};
    cotacao.itens.forEach((item) => {
      const bestPrice = cotacao.itensFornecedor
        ?.map((fornecedor) => {
          const itemFornecedor = fornecedor.itens.find(
            (i) => i.itemId.toString() === item._id.toString()
          );
          return itemFornecedor ? itemFornecedor.valor : null;
        })
        .filter((valor) => valor !== null)
        .reduce((min, valor) => (valor < min ? valor : min), Infinity);

      if (bestPrice) {
        selectedPrices[item._id] = bestPrice;
      }
    });

    res.status(200).json({ selectedPrices });
  } catch (error) {
    console.error("Erro ao selecionar melhores preços:", error);
    res
      .status(500)
      .json({
        message: "Erro ao selecionar melhores preços",
        error: error.message,
      });
  }
});

// Rota para atualizar progresso de uma cotação
router.patch("/:cotacaoId/progresso", async (req, res) => {
  try {
    const { cotacaoId } = req.params;
    const { progresso } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    cotacao.progresso = progresso;
    await cotacao.save();

    res
      .status(200)
      .json({ message: "Progresso atualizado com sucesso", cotacao });
  } catch (error) {
    console.error("Erro ao atualizar progresso:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar progresso", error: error.message });
  }
});

// Rota para enviar cotação para fornecedores
router.patch("/:cotacaoId/enviar", async (req, res) => {
  try {
    const { cotacaoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cotacaoId)) {
      return res.status(400).json({ message: "ID da cotação inválido" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    if (cotacao.status !== "Em cotação") {
      return res
        .status(400)
        .json({ message: "Cotação não está no status correto para envio" });
    }

    cotacao.status = "Enviada para fornecedores";
    await cotacao.save();

    res.status(200).json({ message: "Cotação enviada com sucesso", cotacao });
  } catch (error) {
    console.error("Erro ao enviar cotação:", error);
    res
      .status(500)
      .json({ message: "Erro ao enviar cotação", error: error.message });
  }
});

// Gerar ordens de compra
router.post("/:cotacaoId/ordem-compra/:fornecedorId", async (req, res) => {
  try {
    const { cotacaoId, fornecedorId } = req.params;
    const { itens, total, fornecedor } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(cotacaoId) ||
      !mongoose.Types.ObjectId.isValid(fornecedorId)
    ) {
      return res.status(400).json({ message: "IDs inválidos" });
    }

    const cotacao = await Cotacao.findById(cotacaoId);
    if (!cotacao) {
      return res.status(404).json({ message: "Cotação não encontrada" });
    }

    cotacao.ordensCompra.push({ fornecedorId, itens, total, fornecedor });
    await cotacao.save();

    res.status(201).json({
      message: "Ordem de compra gerada com sucesso",
      ordem: { fornecedorId, itens, total, fornecedor },
    });
  } catch (error) {
    console.error("Erro ao gerar ordem de compra:", error);
    res
      .status(500)
      .json({ message: "Erro ao gerar ordem de compra", error: error.message });
  }
});

export default router;
