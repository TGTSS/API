import express from "express";
import { uploadImagem, uploadDocumento } from "../../cloudinary.js";
import sendEmail from "../utils/send-email.js";

// Controllers
import * as ProjectController from "../controllers/ProjectController.js";
import * as AuthController from "../controllers/AuthController.js";
import * as UserController from "../controllers/UserController.js";
import * as ClientController from "../controllers/ClientController.js";
import * as TeamController from "../controllers/TeamController.js";
import * as FinancialController from "../controllers/FinancialController.js";
import * as CalendarController from "../controllers/CalendarController.js";
import * as BudgetController from "../controllers/BudgetController.js";

const router = express.Router();

// --- Existing Routes ---
router.post("/send-quote", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    await sendEmail({ name, email, phone, message });
    return res
      .status(200)
      .json({ success: true, message: "Cotação solicitada com sucesso!" });
  } catch (error) {
    console.error("Erro na rota /send-quote:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/test", async (req, res) => {
  try {
    const testData = {
      name: "Teste de Verificação API",
      email: "teste@valegnss.com",
      phone: "(00) 0000-0000",
      message:
        "Este é um teste automático para validar a configuração de envio de e-mails da API Vale.",
    };
    await sendEmail(testData);
    return res.status(200).json({
      success: true,
      message: "Teste realizado com sucesso! Verifique sua caixa de entrada.",
    });
  } catch (error) {
    console.error("Erro na rota de teste:", error.message);
    return res.status(500).json({
      success: false,
      message: "Erro ao enviar email de teste",
      error: error.message,
    });
  }
});

// --- New Routes ---

// 1. Auth
router.post(
  "/api/auth/register",
  uploadImagem.single("avatar"),
  AuthController.register
);
router.post("/api/auth/login", AuthController.login);
router.get("/api/users", AuthController.getUsers);
router.get("/api/users/:id", UserController.getUserById);
router.put("/api/users/:id", UserController.updateUser);
router.delete("/api/users/:id", UserController.deleteUser);

// 1.1 User Client Management (Cartorio)
router.get("/api/users/:userId/clients", UserController.getUserClients);
router.post("/api/users/:userId/clients", UserController.addUserClient);
router.delete(
  "/api/users/:userId/clients/:clientId",
  UserController.removeUserClient
);

// 2. Clients
router.get("/api/clients", ClientController.getClients);
router.post("/api/clients", ClientController.createClient);
router.get("/api/clients/:id", ClientController.getClientById);
router.put("/api/clients/:id", ClientController.updateClient);
router.delete("/api/clients/:id", ClientController.deleteClient);
router.post("/api/clients/:id/invite", ClientController.inviteClient);

// 3. Projects
router.get("/api/projects", ProjectController.getProjects);
router.post(
  "/api/projects",
  uploadImagem.single("imagem"),
  ProjectController.createProject
);
router.get("/api/projects/code/:code", ProjectController.getProjectByCode);
router.get("/api/projects/:id", ProjectController.getProjectById);
router.put(
  "/api/projects/:id",
  uploadImagem.single("imagem"),
  ProjectController.updateProject
);
router.delete("/api/projects/:id", ProjectController.deleteProject);
router.post(
  "/api/projects/:id/technical-leads",
  ProjectController.addTechnicalLeads
);
router.delete(
  "/api/projects/:id/technical-leads/:leadId",
  ProjectController.removeTechnicalLead
);

// Timeline Routes
router.post("/api/projects/:id/timeline", ProjectController.addTimelineStep);
router.put(
  "/api/projects/:id/timeline/reorder",
  ProjectController.reorderTimeline
);
router.put(
  "/api/projects/:id/timeline/:stageId",
  ProjectController.updateTimelineStep
);
router.delete(
  "/api/projects/:id/timeline/:stageId",
  ProjectController.deleteTimelineStep
);

// 4. Portal
router.get("/api/portal/projects", ProjectController.getPortalProjects);
router.get("/api/portal/projects/:id", ProjectController.getPortalProjectById);
router.get("/api/portal/profile", ClientController.getPortalProfile);
router.post("/api/portal/activate", ClientController.activatePortalAccount);

// 5. Financials (Transactions)
router.get("/api/transactions", FinancialController.getTransactions);
router.get("/api/transactions/:id", FinancialController.getTransactionById);
router.post("/api/transactions", FinancialController.createTransaction);
router.put("/api/transactions/:id", FinancialController.updateTransaction);
router.delete("/api/transactions/:id", FinancialController.deleteTransaction);
router.get(
  "/api/projects/:projectId/financial-summary",
  FinancialController.getProjectFinancialSummary
);

// 6. Team Management
router.get("/api/team", TeamController.getTeam);
router.post(
  "/api/team",
  uploadImagem.single("avatar"),
  TeamController.createTeamMember
);
router.put(
  "/api/team/:id",
  uploadImagem.single("avatar"),
  TeamController.updateTeamMember
);
router.delete("/api/team/:id", TeamController.deleteTeamMember);

// 7. Calendar
router.get("/api/calendar", CalendarController.getEvents);
router.post("/api/calendar", CalendarController.createEvent);
router.put("/api/calendar/:id", CalendarController.updateEvent);
router.delete("/api/calendar/:id", CalendarController.deleteEvent);

// --- Document Management ---

// 7. Project Documents
router.post(
  "/api/projects/:id/documents",
  uploadDocumento.array("files"),
  ProjectController.uploadDocuments
);
router.delete(
  "/api/projects/:id/documents/:docId",
  ProjectController.deleteDocument
);

// 8. Transaction Attachments
router.post(
  "/api/transactions/:id/attachments",
  uploadDocumento.array("files"),
  FinancialController.uploadAttachments
);
router.delete(
  "/api/transactions/:id/attachments/:attachmentId",
  FinancialController.deleteAttachment
);

// 9. Client Documents
router.post(
  "/api/clients/:id/documents",
  uploadDocumento.array("files"),
  ClientController.uploadDocuments
);
router.delete(
  "/api/clients/:id/documents/:docId",
  ClientController.deleteDocument
);

// --- Budget Management ---

router.get("/api/budgets", BudgetController.getBudgets);
router.get(
  "/api/projects/:projectId/budget",
  BudgetController.getBudgetByProject
);
router.put("/api/projects/:projectId/budget", BudgetController.upsertBudget);
router.delete("/api/projects/:projectId/budget", BudgetController.deleteBudget);
router.patch(
  "/api/projects/:projectId/budget/cost-item/:itemKey",
  BudgetController.updateCostItem
);
router.get(
  "/api/projects/:projectId/budget/totals",
  BudgetController.getBudgetTotals
);

router.post(
  "/api/projects/:projectId/budget/items",
  BudgetController.addBudgetItem
);
router.delete(
  "/api/projects/:projectId/budget/items/:itemId",
  BudgetController.removeBudgetItem
);

router.post(
  "/api/projects/:projectId/budget/send-approval",
  BudgetController.sendForApproval
);
router.post(
  "/api/projects/:projectId/budget/approve",
  BudgetController.approveBudget
);
router.post(
  "/api/projects/:projectId/budget/reject",
  BudgetController.rejectBudget
);

router.get("/api/orcamento/:projectId", BudgetController.getPublicBudget);

export default router;
