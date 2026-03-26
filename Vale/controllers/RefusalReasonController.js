import RefusalReason from "../models/RefusalReason.js";
import Project from "../models/Project.js";
import { formatError } from "../utils/error-handler.js";

/**
 * Listar motivos de recusa
 * GET /api/refusal-reasons
 */
export const getRefusalReasons = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};

    if (active !== undefined) query.active = active === "true";

    const reasons = await RefusalReason.find(query).sort({ label: 1 });
    res.json(reasons);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Criar motivo de recusa
 * POST /api/refusal-reasons
 */
export const createRefusalReason = async (req, res) => {
  try {
    const { label } = req.body;

    if (!label || !label.trim()) {
      return res
        .status(400)
        .json({ message: "O motivo de recusa é obrigatório" });
    }

    const existing = await RefusalReason.findOne({
      label: { $regex: new RegExp(`^${label.trim()}$`, "i") },
    });
    if (existing) {
      return res.status(400).json({ message: "Este motivo já existe" });
    }

    const reason = new RefusalReason({ label: label.trim() });
    await reason.save();

    res.status(201).json(reason);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Atualizar motivo de recusa
 * PUT /api/refusal-reasons/:id
 */
export const updateRefusalReason = async (req, res) => {
  try {
    const { label, active } = req.body;

    const reason = await RefusalReason.findById(req.params.id);
    if (!reason) {
      return res
        .status(404)
        .json({ message: "Motivo de recusa não encontrado" });
    }

    if (label !== undefined) {
      if (!label.trim()) {
        return res
          .status(400)
          .json({ message: "O motivo de recusa é obrigatório" });
      }

      const existing = await RefusalReason.findOne({
        _id: { $ne: req.params.id },
        label: { $regex: new RegExp(`^${label.trim()}$`, "i") },
      });
      if (existing) {
        return res.status(400).json({ message: "Este motivo já existe" });
      }

      reason.label = label.trim();
    }

    if (active !== undefined) reason.active = active;

    await reason.save();
    res.json(reason);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Deletar motivo de recusa
 * DELETE /api/refusal-reasons/:id
 */
export const deleteRefusalReason = async (req, res) => {
  try {
    const reason = await RefusalReason.findById(req.params.id);
    if (!reason) {
      return res
        .status(404)
        .json({ message: "Motivo de recusa não encontrado" });
    }

    await RefusalReason.findByIdAndDelete(req.params.id);
    res.json({ message: "Motivo de recusa removido com sucesso" });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Verificar motivos de recusa usados nos projetos
 * GET /api/refusal-reasons/check
 */
export const checkExistingReasons = async (req, res) => {
  try {
    const projects = await Project.find({
      "timeline.status": "refused",
    }).select("name code timeline");

    const results = [];

    for (const project of projects) {
      const refusedStages = project.timeline.filter(
        (s) => s.status === "refused"
      );

      for (const stage of refusedStages) {
        const registered = stage.refusalReason
          ? await RefusalReason.findOne({ label: stage.refusalReason })
          : null;

        results.push({
          projectName: project.name,
          projectCode: project.code,
          stageTitle: stage.title,
          refusalReason: stage.refusalReason || null,
          refusedAt: stage.refusedAt,
          isRegistered: !!registered,
        });
      }
    }

    res.json({
      totalRefused: results.length,
      registered: results.filter((r) => r.isRegistered).length,
      notRegistered: results.filter((r) => !r.isRegistered).length,
      details: results,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * Migrar motivos de recusa antigos (texto livre) para opções predefinidas
 * POST /api/refusal-reasons/migrate
 *
 * 1. Coleta todos os motivos usados nos projetos
 * 2. Agrupa por similaridade e padroniza
 * 3. Cadastra como opções predefinidas
 * 4. Atualiza os projetos com o texto padronizado
 */
export const migrateExistingReasons = async (req, res) => {
  try {
    // Mapa de padronização: texto antigo → texto padronizado
    const normalizeMap = {
      "Contratou outro profissional": "Contratou outro profissional",
      "Fechou com outro profissional, achou o orçamento da vale muito alto.":
        "Valor acima do esperado",
      "Não respondeu após o envio da proposta":
        "Não respondeu após envio da proposta",
      "Não respondeu após envio da proposta":
        "Não respondeu após envio da proposta",
    };

    const projects = await Project.find({
      "timeline.status": "refused",
    });

    // Coletar motivos únicos e adicionar ao mapa se não existir
    for (const project of projects) {
      for (const stage of project.timeline) {
        if (stage.status === "refused" && stage.refusalReason) {
          if (!normalizeMap[stage.refusalReason]) {
            normalizeMap[stage.refusalReason] = stage.refusalReason.trim();
          }
        }
      }
    }

    // Extrair labels padronizados únicos
    const uniqueLabels = [...new Set(Object.values(normalizeMap))];

    // Criar opções predefinidas que não existem
    const created = [];
    for (const label of uniqueLabels) {
      const exists = await RefusalReason.findOne({
        label: { $regex: new RegExp(`^${label}$`, "i") },
      });
      if (!exists) {
        const reason = new RefusalReason({ label });
        await reason.save();
        created.push(label);
      }
    }

    // Atualizar projetos com texto padronizado
    const updated = [];
    for (const project of projects) {
      let changed = false;

      for (const stage of project.timeline) {
        if (stage.status === "refused" && stage.refusalReason) {
          const normalized = normalizeMap[stage.refusalReason];
          if (normalized && normalized !== stage.refusalReason) {
            stage.refusalReason = normalized;
            changed = true;
          }
        }
      }

      if (changed) {
        await project.save();
        updated.push({
          projectName: project.name,
          projectCode: project.code,
        });
      }
    }

    res.json({
      message: "Migração concluída",
      reasonsCreated: created,
      projectsUpdated: updated,
      totalOptions: uniqueLabels,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
