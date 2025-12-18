import cron from "node-cron";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Obra from "../models/Obra.js";
import Estoque from "../models/Estoque.js";
import Inventario from "../models/Inventario.js";
import sendEmail from "../utils/sendEmail.js";
import TransacaoBruta from "../models/TransacaoBruta.js";
import TransacaoIndependente from "../models/TransacaoIndependente.js";
import {
  generateFinanceHTML,
  generateStockHTML,
  generateDigestText,
} from "./emailTemplates.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://Nexus_wayfallpan:84e7091321e8c8bbdd74986f5dadd8abf919018e@5f7qa.h.filess.io:27018/Nexus_wayfallpan";

// Recupera destinatários do .env ou usa padrão
const EMAIL_TO = process.env.EMAIL_RECIPIENTS
  ? process.env.EMAIL_RECIPIENTS.split(",").map((e) => e.trim())
  : ["modernaedificacoes@gmail.com", "tiagosilvaff18@gmail.com"];

// Função principal do lembrete diário
async function sendDailyReminders() {
  try {
    console.log("🕐 Iniciando rotina de e-mails diários...");
    
    if (mongoose.connection.readyState !== 1) throw new Error("MongoDB desconectado");

    const hoje = new Date();
    const daqui7 = new Date();
    daqui7.setDate(hoje.getDate() + 7);


    console.log("📊 Analisando dados financeiros...");
    const obras = await Obra.find().lean();
    
    // Buscar Transações Brutas (Parents)
    const transacoesBrutas = await TransacaoBruta.find({
        status: { $in: ["pendente", "atrasado"] },
        dataVencimento: { $lte: daqui7 }
    }).lean();

    const idsTransacoesBrutas = new Set(transacoesBrutas.map(t => t._id.toString()));

    let totalReceitas = 0;
    let totalPagamentos = 0;

    obras.forEach(obra => {
        // Filtrar receitas
        obra.receitas = (obra.receitas || []).filter(r => {
            const isDue = ["pendente", "atrasado"].includes(r.status) && r.dataVencimento && new Date(r.dataVencimento) <= daqui7;
            // Se tiver transacaoBrutaId que está na lista de parents, esconde daqui
            const isChild = r.transacaoBrutaId && idsTransacoesBrutas.has(r.transacaoBrutaId.toString());
            return isDue && !isChild;
        });

        // Filtrar despesas
        obra.pagamentos = (obra.pagamentos || []).filter(p => {
            const isDue = ["pendente", "atrasado"].includes(p.status) && p.dataVencimento && new Date(p.dataVencimento) <= daqui7;
            const isChild = p.transacaoBrutaId && idsTransacoesBrutas.has(p.transacaoBrutaId.toString());
            return isDue && !isChild;
        });

        totalReceitas += obra.receitas.length;
        totalPagamentos += obra.pagamentos.length;
    });

    // Adicionar contagem das brutas
    totalPagamentos += transacoesBrutas.length;

    const financeData = {
        obras,
        transacoesBrutas, // Passando para o template
        financeSummary: { hoje, daqui7, totalReceitas, totalPagamentos },
        period: { hoje, daqui7 }
    };

    const financeHTML = generateFinanceHTML(financeData);
    
    // ==========================================
    // 2. PROCESSAR ESTOQUE
    // ==========================================
    console.log("📦 Processando Estoque/Inventário...");
    const lowStockItems = await Estoque.find({ status: "Estoque Baixo" })
      .select("name quantity minQuantity unit location")
      .lean();

    const maintenanceItems = await Inventario.find({ 
        status: { $in: ["manutencao", "danificado"] } 
    }).select("nome codigo status observacoes").lean();

    const stockData = { lowStockItems, maintenanceItems };
    const stockHTML = generateStockHTML(stockData);
    
    console.log(`📮 Destinatários: ${EMAIL_TO.join(", ")}`);

    for (const email of EMAIL_TO) {
        
        try {
            console.log(`📨 Enviando FINANCEIRO para ${email}...`);
            await sendEmail(
                email,
                "💰 Resumo Financeiro Diário",
                generateDigestText(financeData, "Financeiro"),
                financeHTML
            );

            await new Promise(r => setTimeout(r, 1000));

            
            console.log(`📨 Enviando ESTOQUE para ${email}...`);
            await sendEmail(
                email,
                "⚠️ Alerta de Estoque/Manutenção",
                generateDigestText(stockData, "Estoque"),
                stockHTML
            );

        } catch (err) {
            console.error(`❌ Falha ao enviar para ${email}:`, err.message);
        }
    }

    console.log("✅ Processo finalizado!");
    
  } catch (error) {
    console.error("❌ Erro no scheduler:", error);
  }
}

// Função para inicializar o scheduler
export function initScheduler() {
  console.log("🚀 Inicializando scheduler...");
  console.log("🔧 Configurações:");
  console.log("   - Timezone: America/Sao_Paulo");
  console.log("   - Emails para: " + EMAIL_TO.join(", "));

  if (mongoose.connection.readyState !== 1) {
    mongoose.connection.once("connected", () => {
      startScheduledTasks();
    });
  } else {
    startScheduledTasks();
  }
}

function startScheduledTasks() {
  const cronExpression = "0 8 * * *"; // 8:00 AM
  
  cron.schedule(
    cronExpression,
    async () => {
      await sendDailyReminders();
    },
    {
      scheduled: true,
      timezone: "America/Sao_Paulo",
    }
  );
  
  console.log("✅ Scheduler ativo: " + cronExpression);
}

// Função para executar manualmente
export async function runDailyReminders() {
  console.log("🔄 Executando manualmente...");
  await sendDailyReminders();
}
