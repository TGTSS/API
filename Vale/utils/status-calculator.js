import Project from "../models/Project.js";
import Client from "../models/Client.js";
import ProjectStatusLog from "../models/ProjectStatusLog.js";

/**
 * Determines the contract stage index in the timeline.
 * Returns -1 if not found.
 */
function findContractStageIndex(timeline) {
  return timeline.findIndex((stage) =>
    stage.title.toLowerCase().includes("contrato assinado")
  );
}

/**
 * Determines if a stage title matches "elaboração de/do projeto técnico"
 */
function isProjectElaborationStage(title) {
  const lower = title.toLowerCase();
  return lower.includes("elaboração") && lower.includes("projeto técnico");
}

/**
 * Determines if a stage title matches "entrega ao cliente"
 */
function isDeliveryStage(title) {
  return title.toLowerCase().includes("entrega ao cliente");
}

/**
 * Calculates the project status based on the current timeline state.
 * Returns the new status string or null if no change is needed.
 */
export function calculateProjectStatusFromTimeline(project) {
  const timeline = project.timeline || [];
  if (timeline.length === 0) return "PROSPECTING";

  const contractIndex = findContractStageIndex(timeline);

  // No contract stage found — stay in PROSPECTING
  if (contractIndex === -1) return "PROSPECTING";

  const contractStage = timeline[contractIndex];

  // Contract refused → NEGOTIATION_LOST
  if (contractStage.status === "refused") {
    return "NEGOTIATION_LOST";
  }

  // Contract not yet completed → PROSPECTING
  if (contractStage.status !== "completed") {
    return "PROSPECTING";
  }

  // Contract completed — check post-contract stages
  const postContractStages = timeline.slice(contractIndex + 1);

  // Check if delivery stage is completed → COMPLETED
  const deliveryStage = postContractStages.find((s) =>
    isDeliveryStage(s.title)
  );
  if (deliveryStage && deliveryStage.status === "completed") {
    return "COMPLETED";
  }

  // Check if project elaboration stage is started → PROJECT_PRODUCTION
  const elaborationStage = postContractStages.find((s) =>
    isProjectElaborationStage(s.title)
  );
  if (
    elaborationStage &&
    (elaborationStage.status === "in_progress" ||
      elaborationStage.status === "completed")
  ) {
    return "PROJECT_PRODUCTION";
  }

  // Check if any post-contract stage is in progress or completed → FIELD_TEAM
  const anyPostContractActive = postContractStages.some(
    (s) => s.status === "in_progress" || s.status === "completed"
  );
  if (anyPostContractActive) {
    return "FIELD_TEAM";
  }

  // Contract completed but nothing started after → NEGOTIATION_APPROVED
  return "NEGOTIATION_APPROVED";
}

/**
 * Recalculates and updates the client status based on all their project statuses.
 * Priority:
 * 1. Any project FIELD_TEAM or PROJECT_PRODUCTION → ACTIVE
 * 2. Mix of active/approved AND lost → PARTIAL
 * 3. Any project PROSPECTING or NEGOTIATION_APPROVED → NEGOTIATING
 * 4. All NEGOTIATION_LOST → LOST
 * 5. All COMPLETED → COMPLETED
 * 6. No projects → NEGOTIATING
 */
export async function recalculateClientStatus(clientId) {
  const projects = await Project.find({ clientId }, "status");

  if (projects.length === 0) {
    await Client.findByIdAndUpdate(clientId, { status: "NEGOTIATING" });
    return "NEGOTIATING";
  }

  const statuses = projects.map((p) => p.status);

  const hasActive = statuses.some(
    (s) => s === "FIELD_TEAM" || s === "PROJECT_PRODUCTION"
  );
  const hasApprovedOrProspecting = statuses.some(
    (s) => s === "PROSPECTING" || s === "NEGOTIATION_APPROVED"
  );
  const hasLost = statuses.some((s) => s === "NEGOTIATION_LOST");
  const hasCompleted = statuses.some((s) => s === "COMPLETED");
  const allLost = statuses.every((s) => s === "NEGOTIATION_LOST");
  const allCompleted = statuses.every((s) => s === "COMPLETED");

  let newStatus;

  if (hasActive) {
    newStatus = "ACTIVE";
  } else if ((hasApprovedOrProspecting || hasCompleted) && hasLost) {
    newStatus = "PARTIAL";
  } else if (hasApprovedOrProspecting) {
    newStatus = "NEGOTIATING";
  } else if (allLost) {
    newStatus = "LOST";
  } else if (allCompleted) {
    newStatus = "COMPLETED";
  } else {
    newStatus = "NEGOTIATING";
  }

  await Client.findByIdAndUpdate(clientId, { status: newStatus });
  return newStatus;
}

/**
 * Logs a project status change to the history.
 */
export async function logStatusChange({
  projectId,
  fromStatus,
  toStatus,
  triggeredBy = "timeline_update",
  stageTitle,
  refusalReason,
}) {
  if (fromStatus === toStatus) return null;

  const log = new ProjectStatusLog({
    projectId,
    fromStatus,
    toStatus,
    triggeredBy,
    stageTitle,
    refusalReason,
  });
  await log.save();
  return log;
}

/**
 * Full flow: calculate new project status, update if changed, log change, recalculate client.
 * Returns { oldStatus, newStatus, changed }
 */
export async function updateProjectStatusFromTimeline(
  project,
  stageTitle,
  refusalReason
) {
  const oldStatus = project.status;
  const newStatus = calculateProjectStatusFromTimeline(project);

  if (oldStatus === newStatus) {
    return { oldStatus, newStatus, changed: false };
  }

  project.status = newStatus;
  await project.save();

  await logStatusChange({
    projectId: project._id,
    fromStatus: oldStatus,
    toStatus: newStatus,
    triggeredBy: "timeline_update",
    stageTitle,
    refusalReason,
  });

  await recalculateClientStatus(project.clientId);

  return { oldStatus, newStatus, changed: true };
}
