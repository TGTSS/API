import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";

dotenv.config();

async function testEmail() {
  try {
    console.log("🧪 Testando configuração de email...");

    // Verificar variáveis de ambiente
    const requiredVars = ["EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error("❌ Variáveis de ambiente ausentes:");
      missingVars.forEach((varName) => console.error(`   - ${varName}`));
      console.error(
        "Crie um arquivo .env com as variáveis necessárias. Veja env.example para referência."
      );
      process.exit(1);
    }

    console.log("✅ Variáveis de ambiente configuradas");
    console.log(`📧 De: ${process.env.EMAIL_FROM}`);
    console.log(`👤 Usuário: ${process.env.EMAIL_USER}`);

    // Enviar email de teste
    const testEmail = {
      to: "modernaedificacoes@gmail.com",
      subject:
        "🧪 Teste de Configuração - " + new Date().toLocaleString("pt-BR"),
      text: "Este é um email de teste para verificar se a configuração SMTP está funcionando corretamente.",
      html: `
        <h2>🧪 Teste de Configuração</h2>
        <p>Este é um email de teste para verificar se a configuração SMTP está funcionando corretamente.</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString("pt-BR")}</p>
        <p><strong>Status:</strong> ✅ Configuração funcionando!</p>
      `,
    };

    console.log("📤 Enviando email de teste...");
    const result = await sendEmail(
      testEmail.to,
      testEmail.subject,
      testEmail.text,
      testEmail.html
    );

    console.log("✅ Email de teste enviado com sucesso!");
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log("🎉 Configuração de email está funcionando corretamente!");
  } catch (error) {
    console.error("❌ Erro no teste de email:", error.message);
    process.exit(1);
  }
}

// Executar o teste
testEmail();
