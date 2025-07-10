import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";

dotenv.config();

async function testEmail() {
  console.log("🧪 Testando configuração de e-mail...");

  console.log("🔧 Verificando variáveis de ambiente:");
  console.log(
    "   - EMAIL_USER:",
    process.env.EMAIL_USER ? "✅ Configurado" : "❌ Não configurado"
  );
  console.log(
    "   - EMAIL_PASS:",
    process.env.EMAIL_PASS ? "✅ Configurado" : "❌ Não configurado"
  );
  console.log(
    "   - EMAIL_FROM:",
    process.env.EMAIL_FROM ? "✅ Configurado" : "❌ Não configurado"
  );

  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS ||
    !process.env.EMAIL_FROM
  ) {
    console.error("❌ Configuração de e-mail incompleta!");
    console.error("📝 Crie um arquivo .env com as seguintes variáveis:");
    console.error("   EMAIL_USER=seu_email@gmail.com");
    console.error("   EMAIL_PASS=sua_senha_de_app");
    console.error("   EMAIL_FROM=seu_email@gmail.com");
    return;
  }

  try {
    console.log("📧 Enviando e-mail de teste...");

    const result = await sendEmail(
      "tiagosilvaff1@gmail.com",
      "🧪 Teste de E-mail - Sistema de Gestão",
      "Este é um e-mail de teste para verificar se a configuração está funcionando corretamente.",
      `
        <html>
          <body>
            <h2>🧪 Teste de E-mail</h2>
            <p>Este é um e-mail de teste para verificar se a configuração está funcionando corretamente.</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
            <p>✅ Se você recebeu este e-mail, a configuração está funcionando!</p>
          </body>
        </html>
      `
    );

    console.log("✅ E-mail de teste enviado com sucesso!");
    console.log("📧 Message ID:", result.messageId);
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail de teste:", error.message);

    if (error.message.includes("autenticação")) {
      console.error("💡 Dica: Verifique se a senha de app está correta");
    } else if (error.message.includes("conexão")) {
      console.error("💡 Dica: Verifique sua conexão com a internet");
    }
  }
}

// Executar o teste
testEmail();
