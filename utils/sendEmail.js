import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Check if email configuration is available
const hasEmailConfig =
  process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM;

let transporter = null;

console.log("📧 === INICIALIZANDO SENDMAIL ===");
console.log(`EMAIL_USER: ${process.env.EMAIL_USER ? "✅ CONFIGURADO" : "❌ NÃO CONFIGURADO"}`);
console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? "✅ CONFIGURADO" : "❌ NÃO CONFIGURADO"}`);
console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM ? "✅ CONFIGURADO" : "❌ NÃO CONFIGURADO"}`);

if (hasEmailConfig) {
  console.log("✅ Criando transporter com Hostinger SMTP...");
  transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log("✅ Transporter criado com sucesso!");
} else {
  console.error("❌ ERRO: Configuração de email incompleta!");
  console.error("⚠️ Email functionality será DESABILITADO.");
  console.error("Configure as variáveis no .env ou Render environment:");
  console.error("   - EMAIL_USER");
  console.error("   - EMAIL_PASS");
  console.error("   - EMAIL_FROM");
}

const sendEmail = async (to, subject, text, html = null) => {
  // Check if email is configured
  if (!hasEmailConfig) {
    console.error("❌ EMAIL NÃO FOI ENVIADO!");
    console.error(`   Para: ${to}`);
    console.error(`   Assunto: ${subject}`);
    console.error("   Motivo: Credenciais de email não configuradas");
    console.error("");
    console.error("Configure EMAIL_USER, EMAIL_PASS e EMAIL_FROM no .env ou Render");
    return { messageId: "no-email-config", error: "Email not configured" };
  }

  if (!transporter) {
    console.error("❌ Transporter não foi criado!");
    return { messageId: "no-transporter", error: "Transporter not created" };
  }

  // Validate input parameters
  if (!to || !subject || !text) {
    throw new Error(
      "Missing required email parameters: to, subject, and text are required"
    );
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
  };

  // Adicionar HTML se fornecido
  if (html) {
    mailOptions.html = html;
  }

  try {
    console.log(`📧 Tentando enviar email...`);
    console.log(`   Para: ${to}`);
    console.log(`   Assunto: ${subject}`);
    console.log(`   De: ${process.env.EMAIL_FROM}`);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email enviado com sucesso!`);
    console.log(`   Para: ${to}`);
    console.log(`   Message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error.message);
    console.error(`   Para: ${to}`);
    console.error(`   Código de erro: ${error.code}`);

    // Provide more specific error messages
    if (error.code === "EAUTH") {
      console.error("   Motivo: Falha na autenticação SMTP");
      throw new Error(
        "Falha na autenticação SMTP. Verifique EMAIL_USER e EMAIL_PASS no arquivo .env"
      );
    } else if (error.code === "ECONNECTION") {
      console.error("   Motivo: Falha na conexão com servidor SMTP");
      throw new Error(
        "Falha na conexão com o servidor SMTP. Verifique a configuração de rede"
      );
    } else {
      throw new Error(`Erro ao enviar email: ${error.message}`);
    }
  }
};

export default sendEmail;
