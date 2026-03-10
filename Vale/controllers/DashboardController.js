import Project from "../models/Project.js";
import Client from "../models/Client.js";
import Budget from "../models/Budget.js";
import TeamMember from "../models/TeamMember.js";
import FinancialTransaction from "../models/FinancialTransaction.js";
import { formatError } from "../utils/error-handler.js";

/**
 * GET /api/dashboard/metrics
 * Returns all CRM metrics in a single call.
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    // Run all queries in parallel
    const [projects, clients, budgets, transactions, teamMembers] =
      await Promise.all([
        Project.find({}, "status clientId budget"),
        Client.find({}, "status"),
        Budget.find({}, "status total"),
        FinancialTransaction.find(
          {},
          "type amount status date dueDate category"
        ),
        TeamMember.find({}, "status"),
      ]);

    // --- Projects ---
    const projectsByStatus = {};
    for (const p of projects) {
      projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
    }

    // --- Clients ---
    const clientsByStatus = {};
    for (const c of clients) {
      clientsByStatus[c.status] = (clientsByStatus[c.status] || 0) + 1;
    }

    // --- Budgets ---
    const approvedBudgets = budgets.filter((b) => b.status === "approved");
    const rejectedBudgets = budgets.filter((b) => b.status === "rejected");
    const pendingBudgets = budgets.filter(
      (b) => b.status === "draft" || b.status === "pending_approval"
    );
    const budgetTotalValues = approvedBudgets.map((b) => b.total || 0);
    const averageBudgetValue =
      budgetTotalValues.length > 0
        ? budgetTotalValues.reduce((a, b) => a + b, 0) /
          budgetTotalValues.length
        : 0;
    const conversionRate =
      budgets.length > 0
        ? Math.round((approvedBudgets.length / budgets.length) * 100)
        : 0;

    // --- Financial ---
    const now = new Date();
    let totalIncome = 0;
    let totalExpense = 0;
    let realizedRevenue = 0;
    let projectedRevenue = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    const monthlyMap = {};
    const expensesByCategory = {};
    const revenueByStatus = { paid: 0, pending: 0, overdue: 0 };

    for (const t of transactions) {
      const amount = t.amount || 0;

      if (t.type === "INCOME") {
        totalIncome += amount;
        if (t.status === "paid") {
          realizedRevenue += amount;
          revenueByStatus.paid += amount;
        } else if (t.status === "overdue" || (t.dueDate && t.dueDate < now && t.status === "pending")) {
          overdueCount++;
          overdueAmount += amount;
          revenueByStatus.overdue += amount;
        } else {
          projectedRevenue += amount;
          revenueByStatus.pending += amount;
        }
      } else {
        totalExpense += amount;
        if (t.category) {
          expensesByCategory[t.category] =
            (expensesByCategory[t.category] || 0) + amount;
        }
      }

      // Monthly breakdown
      if (t.date) {
        const monthKey = `${t.date.getFullYear()}-${String(
          t.date.getMonth() + 1
        ).padStart(2, "0")}`;
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
        }
        if (t.type === "INCOME") {
          monthlyMap[monthKey].income += amount;
        } else {
          monthlyMap[monthKey].expense += amount;
        }
      }
    }

    const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // --- Team ---
    const activeTeam = teamMembers.filter((m) => m.status === "active").length;

    res.json({
      clients: {
        total: clients.length,
        byStatus: clientsByStatus,
      },
      projects: {
        total: projects.length,
        byStatus: projectsByStatus,
      },
      budgets: {
        total: budgets.length,
        approved: approvedBudgets.length,
        rejected: rejectedBudgets.length,
        pending: pendingBudgets.length,
        conversionRate,
        averageValue: Math.round(averageBudgetValue * 100) / 100,
      },
      financial: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        realizedRevenue,
        projectedRevenue,
        overdueCount,
        overdueAmount,
        monthlyBreakdown,
        expensesByCategory,
        revenueByStatus,
      },
      team: {
        total: teamMembers.length,
        active: activeTeam,
      },
    });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
