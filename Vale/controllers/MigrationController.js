import Project from "../models/Project.js";
import Client from "../models/Client.js";
import { formatError } from "../utils/error-handler.js";
import {
  calculateProjectStatusFromTimeline,
  recalculateClientStatus,
  logStatusChange,
} from "../utils/status-calculator.js";

// New statuses that should not be re-migrated
const NEW_STATUSES = [
  "PROSPECTING",
  "NEGOTIATION_APPROVED",
  "NEGOTIATION_LOST",
  "FIELD_TEAM",
  "PROJECT_PRODUCTION",
  "COMPLETED",
];

/**
 * POST /api/admin/migrate-statuses
 * Query: ?dryRun=true to simulate without applying changes
 *
 * Migrates all projects and clients from old status system to new auto-calculated statuses.
 */
export const migrateStatuses = async (req, res) => {
  try {
    const dryRun = req.query.dryRun === "true";
    const projects = await Project.find({});
    const details = [];
    const migrated = {};

    for (const project of projects) {
      const oldStatus = project.status;

      // Skip projects that already have new statuses (idempotent)
      if (NEW_STATUSES.includes(oldStatus) && oldStatus !== "COMPLETED") {
        // COMPLETED is shared between old and new, so we skip it too
        continue;
      }
      if (oldStatus === "COMPLETED") {
        // Already correct, skip
        continue;
      }

      let newStatus;
      let reason;

      if (oldStatus === "PENDING") {
        newStatus = "PROSPECTING";
        reason = "Migrado de status PENDING";
      } else if (oldStatus === "CANCELED") {
        newStatus = "NEGOTIATION_LOST";
        reason = "Migrado de status CANCELED";
      } else if (oldStatus === "IN_PROGRESS") {
        // Analyze timeline intelligently
        newStatus = calculateProjectStatusFromTimeline(project);
        reason = `Calculado pela timeline (${oldStatus} → ${newStatus})`;
      } else {
        // Unknown status, default to PROSPECTING
        newStatus = "PROSPECTING";
        reason = `Status desconhecido "${oldStatus}" migrado para PROSPECTING`;
      }

      if (oldStatus === newStatus) continue;

      const migrationKey = `${oldStatus} → ${newStatus}`;
      migrated[migrationKey] = (migrated[migrationKey] || 0) + 1;

      details.push({
        projectId: project._id,
        projectName: project.name,
        projectCode: project.code,
        oldStatus,
        newStatus,
        reason,
      });

      if (!dryRun) {
        project.status = newStatus;
        await project.save();

        await logStatusChange({
          projectId: project._id,
          fromStatus: oldStatus,
          toStatus: newStatus,
          triggeredBy: "migration",
          stageTitle: null,
          refusalReason:
            oldStatus === "CANCELED"
              ? "Migrado de status CANCELED"
              : undefined,
        });
      }
    }

    // Recalculate all client statuses
    const clients = await Client.find({});
    const clientStatusResults = {};

    for (const client of clients) {
      if (!dryRun) {
        const newStatus = await recalculateClientStatus(client._id);
        clientStatusResults[newStatus] =
          (clientStatusResults[newStatus] || 0) + 1;
      } else {
        // For dry-run, just count current statuses
        const projects = await Project.find({ clientId: client._id }, "status");
        // Simulate the calculation without saving
        clientStatusResults[client.status] =
          (clientStatusResults[client.status] || 0) + 1;
      }
    }

    res.json({
      message: dryRun
        ? "Simulação concluída (dry-run). Nenhuma alteração aplicada."
        : "Migração concluída com sucesso",
      dryRun,
      summary: {
        totalProjects: projects.length,
        migrated,
        totalClients: clients.length,
        clientsRecalculated: clients.length,
        clientStatusResults,
      },
      details,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

/**
 * POST /api/admin/rollback-statuses
 * Reverts project statuses using the ProjectStatusLog history.
 * Only reverts migration-triggered changes.
 */
export const rollbackStatuses = async (req, res) => {
  try {
    const ProjectStatusLog = (
      await import("../models/ProjectStatusLog.js")
    ).default;

    const migrationLogs = await ProjectStatusLog.find({
      triggeredBy: "migration",
    }).sort({ changedAt: -1 });

    if (migrationLogs.length === 0) {
      return res.json({
        message: "Nenhum registro de migração encontrado para reverter.",
      });
    }

    // Group by projectId, keep only the latest migration log per project
    const latestPerProject = {};
    for (const log of migrationLogs) {
      if (!latestPerProject[log.projectId]) {
        latestPerProject[log.projectId] = log;
      }
    }

    const reverted = [];
    for (const [projectId, log] of Object.entries(latestPerProject)) {
      await Project.findByIdAndUpdate(projectId, {
        status: log.fromStatus,
      });
      reverted.push({
        projectId,
        revertedFrom: log.toStatus,
        revertedTo: log.fromStatus,
      });
    }

    // Remove migration logs
    await ProjectStatusLog.deleteMany({ triggeredBy: "migration" });

    // Recalculate all client statuses
    const clients = await Client.find({});
    for (const client of clients) {
      await recalculateClientStatus(client._id);
    }

    res.json({
      message: "Rollback concluído com sucesso",
      totalReverted: reverted.length,
      reverted,
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
