
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
};

const formatCurrency = (valor) => {
  if (typeof valor !== "number") return valor;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const generateFinanceHTML = ({ obras, transacoesBrutas, financeSummary, period }) => {
  const { hoje, daqui7 } = financeSummary;
  
  const worksContent = renderFinanceSectionCompact(obras, daqui7);
  const grossContent = renderGrossTransactions(transacoesBrutas);
  
  const content = (grossContent || "") + (worksContent || "");
  
  if (!content) return generateAllClearHTML(period, "Financeiro");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Resumo Financeiro</title>
        <style>
            body { font-family: sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; }
            .header { background: #2c3e50; color: #fff; padding: 20px; text-align: center; }
            .header h1 { margin: 0 0 5px 0; font-size: 20px; }
            .header p { margin: 0; opacity: 0.8; font-size: 13px; }
            .content { padding: 20px; }
            .section-header { font-size: 14px; font-weight: bold; color: #555; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase; }
            .obra { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .obra:last-child { border-bottom: none; }
            .obra-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; background: #eee; padding: 5px 10px; border-radius: 4px; }
            .item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
            .item:last-child { border-bottom: none; }
            .row { display: flex; justify-content: space-between; }
            .desc { font-weight: 500; }
            .val { font-weight: bold; white-space: nowrap; margin-left: 10px; }
            .val.inc { color: #27ae60; }
            .val.exp { color: #c0392b; }
            .meta { font-size: 11px; color: #888; margin-top: 3px; }
            .tag-parcela { background: #eee; padding: 1px 4px; border-radius: 3px; font-size: 10px; margin-left: 5px; }
            .footer { background: #f0f0f0; padding: 10px; text-align: center; font-size: 11px; color: #777; }
            .summary { background: #fff3cd; color: #856404; padding: 10px; text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 20px; border-radius: 4px; border: 1px solid #ffeeba; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💰 Resumo Financeiro</h1>
                <p>${formatDate(period.hoje)} a ${formatDate(period.daqui7)}</p>
            </div>
            <div class="content">
                <div class="summary">
                   Total Movimentações: ${financeSummary.totalReceitas + financeSummary.totalPagamentos}
                </div>
                ${content}
            </div>
            <div class="footer">Sistema de Gestão Moderna</div>
        </div>
    </body>
    </html>
  `;
};

const renderGrossTransactions = (transactions) => {
    if (!transactions || !transactions.length) return "";
    
    return `
        <div class="section-header">🧾 Contas Consolidadas (Transações Brutas)</div>
        <div class="obra">
            ${transactions.map(t => {
                const parcelaInfo = t.numeroParcela ? `<span class="tag-parcela">P${t.numeroParcela}/${t.totalParcelas || '-'}</span>` : '';
                return `
                <div class="item">
                    <div class="row">
                        <span class="desc">${t.descricao}${parcelaInfo}</span>
                        <span class="val exp">- ${formatCurrency(t.valor)}</span>
                    </div>
                    <div class="meta">Vence: ${formatDate(t.dataVencimento)}</div>
                </div>
            `}).join("")}
        </div>
        <div class="section-header">🏗️ Detalhes por Obra</div>
    `;
};

export const generateStockHTML = ({ lowStockItems, maintenanceItems }) => {
  const hasLowStock = lowStockItems.length > 0;
  const hasMaintenance = maintenanceItems.length > 0;

  if (!hasLowStock && !hasMaintenance) return generateAllClearHTML({ hoje: new Date() }, "Estoque");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Alerta de Estoque</title>
        <style>
            body { font-family: sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; }
            .header { background: #d35400; color: #fff; padding: 20px; text-align: center; }
            h1 { margin: 0; font-size: 20px; }
            h2 { font-size: 16px; color: #d35400; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px; }
            .content { padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { text-align: left; background: #f0f0f0; padding: 8px; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            .warn { color: #d35400; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>⚠️ Alerta de Estoque</h1></div>
            <div class="content">
                ${hasLowStock ? `
                    <h2>Estoque Baixo</h2>
                    <table>
                        <tr><th>Item</th><th>Local</th><th>Qtd</th></tr>
                        ${lowStockItems.map(i => `
                            <tr>
                                <td>${i.name}</td>
                                <td>${i.location}</td>
                                <td><span class="warn">${i.quantity}</span> (Mín: ${i.minQuantity})</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : ''}

                ${hasMaintenance ? `
                    <h2>Em Manutenção</h2>
                    <ul>
                    ${maintenanceItems.map(i => `
                        <li><b>${i.nome}</b>: ${i.observacoes || 'Sem detalhes'}</li>
                    `).join('')}
                    </ul>
                ` : ''}
            </div>
        </div>
    </body>
    </html>
  `;
};

const renderFinanceSectionCompact = (obras, daqui7) => {
  return obras
    .map((obra) => {
      const receitas = (obra.receitas || []).filter(r => isPendingAndDue(r, daqui7));
      const despesas = (obra.pagamentos || []).filter(p => isPendingAndDue(p, daqui7));

      if (!receitas.length && !despesas.length) return "";

      return `
        <div class="obra">
            <div class="obra-title">${obra.nome}</div>
            ${receitas.map(r => `
                <div class="item">
                    <div class="row">
                        <span class="desc">${r.descricao}</span>
                        <span class="val inc">+ ${formatCurrency(r.valor)}</span>
                    </div>
                    <div class="meta">Vence: ${formatDate(r.dataVencimento)}</div>
                </div>
            `).join("")}
            ${despesas.map(p => `
                <div class="item">
                    <div class="row">
                        <span class="desc">${p.descricao}</span>
                        <span class="val exp">- ${formatCurrency(p.valor)}</span>
                    </div>
                    <div class="meta">Vence: ${formatDate(p.dataVencimento)}</div>
                </div>
            `).join("")}
        </div>
    `;
    })
    .join("");
};



const isPendingAndDue = (item, limitDate) => {
  if (!item.dataVencimento) return false;
  const dueDate = new Date(item.dataVencimento);
  return (
    ["pendente", "atrasado"].includes(item.status) && dueDate <= limitDate
  );
};

const generateAllClearHTML = (period, context = "Geral") => {
    const range = period.daqui7 ? `de ${formatDate(period.hoje)} a ${formatDate(period.daqui7)}` : `em ${formatDate(period.hoje)}`;
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="font-family: sans-serif; text-align: center; padding: 50px; color: #555;">
          <h1 style="color: #27ae60;">✅ Tudo OK (${context})!</h1>
          <p>Não há pendências para o período ${range}.</p>
      </body>
      </html>
    `;
  };
  
  export const generateDigestText = (summary, type) => {
      return `Resumo ${type}: Verifique o HTML para detalhes.`;
  };
