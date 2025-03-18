import express from "express";
import mongoose from "mongoose";
import Obra from "../models/Obra.js";
import StatusObra from "../models/StatusObra.js";
import TipoObra from "../models/TipoObra.js";
import QuemPaga from "../models/QuemPaga.js";
import Conta from "../models/Conta.js";
import Etapa from "../models/Etapa.js"; // Adicionado
import RegistroDiario from "../models/RegistroDiario.js"; // Adicionado
import Galeria from "../models/Galeria.js"; // Adicionado
import Documento from "../models/Documento.js"; // Adicionado

const router = express.Router();

// Rota para listar todos os status de obra
router.get("/status", async (req, res) => {
  try {
    const status = await StatusObra.find();
    res.json(status);
  } catch (error) {
    console.error("Erro ao buscar status de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo status de obra
router.post("/status", async (req, res) => {
  try {
    const status = new StatusObra(req.body);
    const savedStatus = await status.save();
    res.status(201).json(savedStatus);
  } catch (error) {
    console.error("Erro ao criar status de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os tipos de obra
router.get("/tipos", async (req, res) => {
  try {
    const tipos = await TipoObra.find();
    res.json(tipos);
  } catch (error) {
    console.error("Erro ao buscar tipos de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo tipo de obra
router.post("/tipos", async (req, res) => {
  try {
    const tipo = new TipoObra(req.body);
    const savedTipo = await tipo.save();
    res.status(201).json(savedTipo);
  } catch (error) {
    console.error("Erro ao criar tipo de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os quem paga
router.get("/quem-paga", async (req, res) => {
  try {
    const quemPaga = await QuemPaga.find();
    res.json(quemPaga);
  } catch (error) {
    console.error("Erro ao buscar quem paga:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo quem paga
router.post("/quem-paga", async (req, res) => {
  try {
    const quemPaga = new QuemPaga(req.body);
    const savedQuemPaga = await quemPaga.save();
    res.status(201).json(savedQuemPaga);
  } catch (error) {
    console.error("Erro ao criar quem paga:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todas as contas
router.get("/contas", async (req, res) => {
  try {
    const contas = await Conta.find();
    res.json(contas);
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova conta
router.post("/contas", async (req, res) => {
  try {
    const conta = new Conta(req.body);
    const savedConta = await conta.save();
    res.status(201).json(savedConta);
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter o último código de obra
router.get("/ultimo-codigo", async (req, res) => {
  try {
    const ultimaObra = await Obra.findOne()
      .sort({ codigo: -1 })
      .select("codigo");
    const ultimoCodigo = ultimaObra
      ? parseInt(ultimaObra.codigo.split("-")[1])
      : 0;
    res.json({ ultimoCodigo });
  } catch (error) {
    console.error("Erro ao obter o último código de obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova obra
router.post("/", async (req, res) => {
  try {
    const {
      status,
      tipo,
      quemPaga,
      conta,
      cliente,
      areaConstruida,
      contatos,
      mapPosition,
      visivelPara,
      contatoPrincipal,
      documentos,
      dataInicio,
      previsaoTermino,
      imagem,
      ...rest
    } = req.body;

    // Converter valores numéricos
    const areaConstruidaNumber = parseFloat(areaConstruida.replace(",", "."));
    if (isNaN(areaConstruidaNumber)) {
      return res
        .status(400)
        .json({ message: "Valor de área construída inválido" });
    }

    const obra = new Obra({
      ...rest,
      areaConstruida: areaConstruidaNumber,
      status: mongoose.Types.ObjectId.isValid(status)
        ? new mongoose.Types.ObjectId(status)
        : null,
      tipo: mongoose.Types.ObjectId.isValid(tipo)
        ? new mongoose.Types.ObjectId(tipo)
        : null,
      quemPaga: mongoose.Types.ObjectId.isValid(quemPaga)
        ? new mongoose.Types.ObjectId(quemPaga)
        : null,
      conta: mongoose.Types.ObjectId.isValid(conta)
        ? new mongoose.Types.ObjectId(conta)
        : null,
      cliente: mongoose.Types.ObjectId.isValid(cliente)
        ? new mongoose.Types.ObjectId(cliente)
        : null,
      contatos: contatos.map((contato) => ({
        nome: contato.nome,
        telefone: contato.telefone,
        cargo: contato.cargo,
        email: contato.email,
      })),
      mapPosition: mapPosition,
      visivelPara,
      contatoPrincipal,
      documentos: documentos.map((doc) => ({
        nome: doc.nome,
        arquivo: doc.arquivo,
      })),
      dataInicio,
      previsaoTermino,
      imagem,
    });

    const savedObra = await obra.save();
    res.status(201).json(savedObra);
  } catch (error) {
    console.error("Erro ao criar obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todas as obras
router.get("/", async (req, res) => {
  try {
    const obras = await Obra.find()
      .populate("cliente")
      .populate("status")
      .populate("tipo")
      .populate("quemPaga")
      .populate("conta");
    res.json(obras);
  } catch (error) {
    console.error("Erro ao buscar obras:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para buscar uma obra específica
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    const obra = await Obra.findById(id)
      .populate("cliente")
      .populate("status")
      .populate("tipo")
      .populate("quemPaga")
      .populate("conta");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.json(obra);
  } catch (error) {
    console.error("Erro ao buscar obra:", error);
    res.status(500).json({ message: error.message });
  }
});
// Rota para listar todas as etapas de uma obra
router.get("/:id/etapas", async (req, res) => {
  try {
    const { id } = req.params;
    const etapas = await Etapa.find({ obra: id });
    res.json(etapas);
  } catch (error) {
    console.error("Erro ao buscar etapas da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os registros diários de uma obra
router.get("/:id/registros", async (req, res) => {
  try {
    const { id } = req.params;
    const registros = await RegistroDiario.find({ obra: id });
    res.json(registros);
  } catch (error) {
    console.error("Erro ao buscar registros diários da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todas as fotos da galeria de uma obra
router.get("/:id/galeria", async (req, res) => {
  try {
    const { id } = req.params;
    const fotos = await Galeria.find({ obra: id });
    res.json(fotos);
  } catch (error) {
    console.error("Erro ao buscar galeria de fotos da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os documentos de uma obra
router.get("/:id/documentos", async (req, res) => {
  try {
    const { id } = req.params;
    const documentos = await Documento.find({ obra: id });
    res.json(documentos);
  } catch (error) {
    console.error("Erro ao buscar documentos da obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo registro diário
router.post("/:id/registros", async (req, res) => {
  try {
    const { id } = req.params;
    const registro = new RegistroDiario({ ...req.body, obra: id });
    const savedRegistro = await registro.save();
    res.status(201).json(savedRegistro);
  } catch (error) {
    console.error("Erro ao criar registro diário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar uma nova etapa
router.post("/:id/etapas", async (req, res) => {
  try {
    const { id } = req.params;
    const etapa = new Etapa({ ...req.body, obra: id });
    const savedEtapa = await etapa.save();
    res.status(201).json(savedEtapa);
  } catch (error) {
    console.error("Erro ao criar etapa:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar fotos à galeria
router.post("/:_id/galeria", async (req, res) => {
  try {
    const { id } = req.params;
    const fotos = req.body.fotos.map((foto) => ({ ...foto, obra: id }));
    const savedFotos = await Galeria.insertMany(fotos);
    res.status(201).json(savedFotos);
  } catch (error) {
    console.error("Erro ao adicionar fotos à galeria:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para adicionar documentos
router.post("/:id/documentos", async (req, res) => {
  try {
    const { id } = req.params;
    const documentos = req.body.documentos.map((documento) => ({
      ...documento,
      obra: id,
    }));
    const savedDocumentos = await Documento.insertMany(documentos);
    res.status(201).json(savedDocumentos);
  } catch (error) {
    console.error("Erro ao adicionar documentos:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar uma obra
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      tipo,
      quemPaga,
      conta,
      cliente,
      mapPosition,
      visivelPara,
      contatoPrincipal,
      documentos,
      dataInicio,
      previsaoTermino,
      imagem,
      ...rest
    } = req.body;

    const updatedObra = await Obra.findByIdAndUpdate(
      id,
      {
        ...rest,
        status: mongoose.Types.ObjectId.isValid(status)
          ? mongoose.Types.ObjectId(status)
          : null,
        tipo: mongoose.Types.ObjectId.isValid(tipo)
          ? mongoose.Types.ObjectId(tipo)
          : null,
        quemPaga: mongoose.Types.ObjectId.isValid(quemPaga)
          ? mongoose.Types.ObjectId(quemPaga)
          : null,
        conta: mongoose.Types.ObjectId.isValid(conta)
          ? mongoose.Types.ObjectId(conta)
          : null,
        cliente: mongoose.Types.ObjectId.isValid(cliente)
          ? mongoose.Types.ObjectId(cliente)
          : null,
        mapPosition: mapPosition,
        visivelPara,
        contatoPrincipal,
        documentos: documentos.map((doc) => ({
          nome: doc.nome,
          arquivo: doc.arquivo,
        })),
        dataInicio,
        previsaoTermino,
        imagem,
      },
      { new: true }
    );

    if (!updatedObra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.json(updatedObra);
  } catch (error) {
    console.error("Erro ao atualizar obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir uma obra
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedObra = await Obra.findByIdAndDelete(id);
    if (!deletedObra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }
    res.status(200).json({ message: "Obra excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir obra:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter o orçamento de uma obra específica
router.get("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("orcamento");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao buscar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { stages, globalBdi, dataCriacao } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ message: "Stages deve ser um array" });
    }

    const orcamentoData = {
      stages: stages.map((stage) => ({
        ...stage,
        subStages: (stage.subStages || []).map((subStage) => ({
          ...subStage,
          items: (subStage.items || []).map((item) => ({
            ...item,
            custoTotal: item.quantity * item.unitPrice,
            precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
            precoTotal:
              item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
            _id: undefined, // Remover _id
          })),
          _id: undefined, // Remover _id
        })),
        items: (stage.items || []).map((item) => ({
          ...item,
          custoTotal: item.quantity * item.unitPrice,
          precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
          precoTotal:
            item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
          _id: undefined, // Remover _id
        })),
        _id: undefined, // Remover _id
      })),
      globalBdi,
      dataCriacao: dataCriacao || new Date(),
      dataAtualizacao: new Date(),
    };

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $set: { orcamento: orcamentoData } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar ou atualizar o orçamento de uma obra
router.put("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { stages, globalBdi, dataCriacao } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ message: "Stages deve ser um array" });
    }

    const orcamentoData = {
      stages: stages.map((stage) => ({
        ...stage,
        subStages: (stage.subStages || []).map((subStage) => ({
          ...subStage,
          items: (subStage.items || []).map((item) => ({
            ...item,
            custoTotal: item.quantity * item.unitPrice,
            precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
            precoTotal:
              item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
            _id: undefined, // Remover _id
          })),
          _id: undefined, // Remover _id
        })),
        items: (stage.items || []).map((item) => ({
          ...item,
          custoTotal: item.quantity * item.unitPrice,
          precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
          precoTotal:
            item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
          _id: undefined, // Remover _id
        })),
        _id: undefined, // Remover _id
      })),
      globalBdi,
      dataCriacao: dataCriacao || new Date(),
      dataAtualizacao: new Date(),
    };

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $set: { orcamento: orcamentoData } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar ou atualizar o orçamento de uma obra (POST)
router.post("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { stages, globalBdi, dataCriacao } = req.body;

    if (!Array.isArray(stages)) {
      return res.status(400).json({ message: "Stages deve ser um array" });
    }

    const orcamentoData = {
      stages: stages.map((stage) => ({
        ...stage,
        subStages: (stage.subStages || []).map((subStage) => ({
          ...subStage,
          items: (subStage.items || []).map((item) => ({
            ...item,
            custoTotal: item.quantity * item.unitPrice,
            precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
            precoTotal:
              item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
            _id: undefined, // Remover _id
          })),
          _id: undefined, // Remover _id
        })),
        items: (stage.items || []).map((item) => ({
          ...item,
          custoTotal: item.quantity * item.unitPrice,
          precoUnitario: item.unitPrice * (1 + (item.bdi || 0) / 100),
          precoTotal:
            item.quantity * item.unitPrice * (1 + (item.bdi || 0) / 100),
          _id: undefined, // Remover _id
        })),
        _id: undefined, // Remover _id
      })),
      globalBdi,
      dataCriacao: dataCriacao || new Date(),
      dataAtualizacao: new Date(),
    };

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $set: { orcamento: orcamentoData } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.status(200).json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar apenas o BDI global do orçamento
router.patch("/:id/orcamento/bdi", async (req, res) => {
  try {
    const { id } = req.params;
    const { globalBdi } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,
      {
        $set: {
          "orcamento.globalBdi": globalBdi,
          "orcamento.dataAtualizacao": new Date(),
        },
      },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.orcamento);
  } catch (error) {
    console.error("Erro ao atualizar BDI global:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para excluir o orçamento de uma obra
router.delete("/:id/orcamento", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findByIdAndUpdate(
      id,
      { $unset: { orcamento: 1 } },
      { new: true }
    );

    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json({ message: "Orçamento excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para atualizar o progresso de uma etapa
router.patch("/:obraId/etapas/:etapaId/progresso", async (req, res) => {
  try {
    const { obraId, etapaId } = req.params;
    const { progresso, subetapas } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(obraId) ||
      !mongoose.Types.ObjectId.isValid(etapaId)
    ) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const etapa = await Etapa.findOneAndUpdate(
      { _id: etapaId, obra: obraId },
      { $set: { progresso, subetapas } },
      { new: true }
    );

    if (!etapa) {
      return res.status(404).json({ message: "Etapa não encontrada" });
    }

    res.json(etapa);
  } catch (error) {
    console.error("Erro ao atualizar progresso da etapa:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo registro diário
router.post("/:id/registros-diarios", async (req, res) => {
  try {
    const { id } = req.params;
    const { registro, etapas } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Atualizar progresso das etapas no orçamento
    obra.orcamento.stages.forEach((stage) => {
      const updatedStage = etapas.find((e) => e.id === stage.id);
      if (updatedStage) {
        stage.progresso = updatedStage.progresso;
        stage.subStages.forEach((subStage) => {
          const updatedSubStage = updatedStage.subetapas.find(
            (se) => se.id === subStage.id
          );
          if (updatedSubStage) {
            subStage.progresso = updatedSubStage.progresso;
          }
        });
      }
    });

    // Adicionar registro diário
    obra.registrosDiarios.push({ ...registro, obra: id });
    await obra.save();

    res.status(201).json(obra.registrosDiarios);
  } catch (error) {
    console.error("Erro ao criar registro diário:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para listar todos os registros diários de uma obra
router.get("/:id/registros-diarios", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("registrosDiarios");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.registrosDiarios);
  } catch (error) {
    console.error("Erro ao buscar registros diários:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para obter etapas e subetapas do orçamento de uma obra
router.get("/:id/orcamento/etapas", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id).select("orcamento.stages");
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    res.json(obra.orcamento.stages);
  } catch (error) {
    console.error("Erro ao buscar etapas do orçamento:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rota para criar um novo registro diário
router.post("/:id/registros-diarios", async (req, res) => {
  try {
    const { id } = req.params;
    const { registro } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const obra = await Obra.findById(id);
    if (!obra) {
      return res.status(404).json({ message: "Obra não encontrada" });
    }

    // Atualizar progresso das etapas no orçamento
    obra.orcamento.stages.forEach((stage) => {
      const updatedStage = registro.etapas.find((e) => e.id === stage.id);
      if (updatedStage) {
        stage.progresso = updatedStage.progresso;
        stage.subStages.forEach((subStage) => {
          const updatedSubStage = updatedStage.subetapas.find(
            (se) => se.nome === subStage.nome
          );
          if (updatedSubStage) {
            subStage.progresso = updatedSubStage.progresso;
          }
        });
      }
    });

    // Adicionar registro diário
    obra.registrosDiarios.push(registro);
    await obra.save();

    res.status(201).json(obra.registrosDiarios);
  } catch (error) {
    console.error("Erro ao criar registro diário:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
