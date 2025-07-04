import cron from "node-cron";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Obra from "../models/Obra.js";
import sendEmail from "../utils/sendEmail.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://Nexus_wayfallpan:84e7091321e8c8bbdd74986f5dadd8abf919018e@5f7qa.h.filess.io:27018/Nexus_wayfallpan";
const EMAIL_TO = "modernaedificacoes@gmail.com";

// Funções auxiliares
function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatCurrency(valor) {
  if (typeof valor !== "number") return valor;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function generateHTMLEmail(
  obras,
  hoje,
  daqui7,
  totalReceitas,
  totalPagamentos
) {
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lembrete Diário - Receitas e Despesas</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: #Feeadd; color: #333; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 300; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 30px; }
            .periodo { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin-bottom: 25px; border-radius: 0 5px 5px 0; }
            .periodo h2 { margin: 0 0 10px 0; color: #667eea; font-size: 18px; }
            .periodo p { margin: 0; color: #666; }
            .obra { margin-bottom: 25px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
            .obra-header { background-color: #f8f9fa; padding: 15px; border-bottom: 1px solid #e9ecef; }
            .obra-header h3 { margin: 0; color: #495057; font-size: 16px; font-weight: 600; }
            .obra-content { padding: 15px; }
            .secao { margin-bottom: 20px; }
            .secao h4 { margin: 0 0 10px 0; color: #495057; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .item { background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 5px; padding: 12px; margin-bottom: 8px; }
            .item:last-child { margin-bottom: 0; }
            .item-title { font-weight: 600; color: #495057; margin-bottom: 5px; }
            .item-details { color: #6c757d; font-size: 13px; }
            .valor { color: #28a745; font-weight: 600; }
            .valor.despesa { color: #dc3545; }
            .vencimento { color: #fd7e14; font-weight: 500; }
            .resumo { background: #Feeadd; color: #333; padding: 20px; border-radius: 8px; margin-top: 25px; }
            .resumo h3 { margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px; }
            .resumo h3 img { width: 22px; height: 22px; vertical-align: middle; }
            .resumo-stats { display: flex; justify-content: space-between; text-align: center; margin-top: 20px; }
            .stat { flex: 1; }
            .stat-number { 
                font-size: 28px; 
                font-weight: bold; 
                margin-bottom: 12px; /* Aumenta o espaço abaixo do número */
            }
            .stat-label { 
                font-size: 13px; 
                opacity: 0.9; 
                text-transform: uppercase; 
                letter-spacing: 0.5px; 
                display: block;
                margin-top: 6px; /* Garante espaçamento extra acima do label */
                padding: 2px;
            }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef; }
            .footer p { margin: 0; color: #6c757d; font-size: 12px; }
            .empty-state { text-align: center; padding: 40px 20px; color: #6c757d; }
            .empty-state h3 { margin: 0 0 10px 0; color: #495057; }
            .empty-state p { margin: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Lembrete Diário</h1>
                <p>Receitas e Despesas a Vencer</p>
            </div>
            
            <div class="content">
                <div class="periodo">
                    <h2>📅 Período de Análise</h2>
                    <p>De ${formatDate(hoje)} até ${formatDate(daqui7)}</p>
                </div>
                
                ${
                  totalReceitas === 0 && totalPagamentos === 0
                    ? `
                    <div class="empty-state">
                        <h3>✅ Tudo em dia!</h3>
                        <p>Nenhuma receita ou despesa a vencer nos próximos 7 dias.</p>
                    </div>
                `
                    : `
                    ${obras
                      .map((obra) => {
                        const receitasVencer = (obra.receitas || []).filter(
                          (r) =>
                            r.status === "pendente" &&
                            r.dataVencimento &&
                            new Date(r.dataVencimento) >= hoje &&
                            new Date(r.dataVencimento) <= daqui7
                        );
                        const pagamentosVencer = (obra.pagamentos || []).filter(
                          (p) =>
                            p.status === "pendente" &&
                            p.dataVencimento &&
                            new Date(p.dataVencimento) >= hoje &&
                            new Date(p.dataVencimento) <= daqui7
                        );

                        if (
                          receitasVencer.length === 0 &&
                          pagamentosVencer.length === 0
                        )
                          return "";

                        return `
                            <div class="obra">
                                <div class="obra-header">
                                    <h3>🏗️ ${obra.nome}</h3>
                                </div>
                                <div class="obra-content">
                                    ${
                                      receitasVencer.length > 0
                                        ? `
                                        <div class="secao">
                                            <h4>💰 Receitas a Vencer</h4>
                                            ${receitasVencer
                                              .map(
                                                (r) => `
                                                <div class="item">
                                                    <div class="item-title">${
                                                      r.descricao
                                                    }</div>
                                                    <div class="item-details">
                                                        <span class="valor">${formatCurrency(
                                                          r.valor
                                                        )}</span> • 
                                                        <span class="vencimento">Vence em ${formatDate(
                                                          r.dataVencimento
                                                        )}</span>
                                                    </div>
                                                </div>
                                            `
                                              )
                                              .join("")}
                                        </div>
                                    `
                                        : ""
                                    }
                                    
                                    ${
                                      pagamentosVencer.length > 0
                                        ? `
                                        <div class="secao">
                                            <h4>💸 Despesas a Vencer</h4>
                                            ${pagamentosVencer
                                              .map(
                                                (p) => `
                                                <div class="item">
                                                    <div class="item-title">${
                                                      p.descricao
                                                    }</div>
                                                    <div class="item-details">
                                                        <span class="valor despesa">${formatCurrency(
                                                          p.valor
                                                        )}</span> • 
                                                        <span class="vencimento">Vence em ${formatDate(
                                                          p.dataVencimento
                                                        )}</span>
                                                    </div>
                                                </div>
                                            `
                                              )
                                              .join("")}
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        `;
                      })
                      .join("")}
                    
                    <div class="resumo">
                        <h3><img src="https://cdn-icons-png.flaticon.com/512/1828/1828884.png" alt="Resumo" style="width:22px;height:22px;vertical-align:middle;"> Resumo Geral</h3>
                        <div class="resumo-stats">
                            <div class="stat">
                                <div class="stat-number">${totalReceitas}</div>
                                <div class="stat-label">Receitas</div>
                            </div>
                            <div class="stat">
                                <div class="stat-number">${totalPagamentos}</div>
                                <div class="stat-label">Despesas</div>
                            </div>
                        </div>
                    </div>
                `
                }
            </div>
            
            <div class="footer">
                <p>📧 Este e-mail foi gerado automaticamente pelo sistema de gestão de obras</p>
                <p>⏰ Enviado em ${new Date().toLocaleString("pt-BR")}</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return htmlTemplate;
}

function generateTextEmail(
  obras,
  hoje,
  daqui7,
  totalReceitas,
  totalPagamentos
) {
  let corpoEmail = `Resumo de receitas e despesas a vencer nos próximos 7 dias (de ${formatDate(
    hoje
  )} até ${formatDate(daqui7)}):\n\n`;

  for (const obra of obras) {
    const receitasVencer = (obra.receitas || []).filter(
      (r) =>
        r.status === "pendente" &&
        r.dataVencimento &&
        new Date(r.dataVencimento) >= hoje &&
        new Date(r.dataVencimento) <= daqui7
    );
    const pagamentosVencer = (obra.pagamentos || []).filter(
      (p) =>
        p.status === "pendente" &&
        p.dataVencimento &&
        new Date(p.dataVencimento) >= hoje &&
        new Date(p.dataVencimento) <= daqui7
    );

    if (receitasVencer.length || pagamentosVencer.length) {
      corpoEmail += `Obra: ${obra.nome}\n`;
      if (receitasVencer.length) {
        corpoEmail += `  Receitas a vencer:\n`;
        receitasVencer.forEach((r) => {
          corpoEmail += `    - ${r.descricao} | Valor: ${formatCurrency(
            r.valor
          )} | Vencimento: ${formatDate(r.dataVencimento)}\n`;
        });
      }
      if (pagamentosVencer.length) {
        corpoEmail += `  Despesas a vencer:\n`;
        pagamentosVencer.forEach((p) => {
          corpoEmail += `    - ${p.descricao} | Valor: ${formatCurrency(
            p.valor
          )} | Vencimento: ${formatDate(p.dataVencimento)}\n`;
        });
      }
      corpoEmail += "\n";
    }
  }

  if (totalReceitas === 0 && totalPagamentos === 0) {
    corpoEmail += "Nenhuma receita ou despesa a vencer nos próximos 7 dias.";
  } else {
    corpoEmail += `Total de receitas a vencer: ${totalReceitas}\nTotal de despesas a vencer: ${totalPagamentos}`;
  }

  return corpoEmail;
}

// Função principal do lembrete diário
async function sendDailyReminders() {
  try {
    console.log("🕐 Iniciando verificação de lembretes diários...");

    const hoje = new Date();
    const daqui7 = new Date();
    daqui7.setDate(hoje.getDate() + 7);

    const obras = await Obra.find().lean();
    let totalReceitas = 0;
    let totalPagamentos = 0;

    // Contar totais
    for (const obra of obras) {
      const receitasVencer = (obra.receitas || []).filter(
        (r) =>
          r.status === "pendente" &&
          r.dataVencimento &&
          new Date(r.dataVencimento) >= hoje &&
          new Date(r.dataVencimento) <= daqui7
      );
      const pagamentosVencer = (obra.pagamentos || []).filter(
        (p) =>
          p.status === "pendente" &&
          p.dataVencimento &&
          new Date(p.dataVencimento) >= hoje &&
          new Date(p.dataVencimento) <= daqui7
      );

      totalReceitas += receitasVencer.length;
      totalPagamentos += pagamentosVencer.length;
    }

    // Gerar e-mails
    const htmlEmail = generateHTMLEmail(
      obras,
      hoje,
      daqui7,
      totalReceitas,
      totalPagamentos
    );
    const textEmail = generateTextEmail(
      obras,
      hoje,
      daqui7,
      totalReceitas,
      totalPagamentos
    );

    // Enviar e-mail
    await sendEmail(
      EMAIL_TO,
      "📊 Lembrete Diário: Receitas e Despesas a Vencer",
      textEmail,
      htmlEmail
    );

    console.log("✅ Lembrete diário enviado com sucesso!");
    console.log(
      `📊 Resumo: ${totalReceitas} receitas e ${totalPagamentos} despesas a vencer`
    );
  } catch (error) {
    console.error("❌ Erro ao enviar lembrete diário:", error);
  }
}

// Função para inicializar o scheduler
export function initScheduler() {
  console.log("🚀 Inicializando scheduler...");

  // Verificar conexão com MongoDB
  if (mongoose.connection.readyState !== 1) {
    console.log("⏳ Aguardando conexão com MongoDB...");
    mongoose.connection.once("connected", () => {
      console.log("✅ MongoDB conectado, iniciando agendamentos...");
      startScheduledTasks();
    });
  } else {
    console.log("✅ MongoDB já conectado, iniciando agendamentos...");
    startScheduledTasks();
  }
}

// Função para iniciar as tarefas agendadas
function startScheduledTasks() {
  // Lembrete diário - executar às 8h da manhã todos os dias
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("📅 Executando lembrete diário agendado...");
      await sendDailyReminders();
    },
    {
      scheduled: true,
      timezone: "America/Sao_Paulo",
    }
  );

  console.log("✅ Scheduler configurado:");
  console.log("   📧 Lembrete diário: 08:00 (horário de Brasília)");

  // Executar imediatamente na primeira vez (opcional)
  // setTimeout(() => {
  //   console.log('🔄 Executando primeiro lembrete...');
  //   sendDailyReminders();
  // }, 5000);
}

// Função para executar manualmente (para testes)
export async function runDailyReminders() {
  console.log("🔄 Executando lembrete diário manualmente...");
  await sendDailyReminders();
}
