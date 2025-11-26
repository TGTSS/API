import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Check if email configuration is available
const hasEmailConfig =
  process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM;

let transporter = null;

if (hasEmailConfig) {
  transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  console.warn(
    "⚠️ Email configuration not found. Email functionality will be disabled."
  );
  console.warn(
    "To enable email functionality, set the following environment variables:"
  );
  console.warn("   - EMAIL_USER");
  console.warn("   - EMAIL_PASS");
  console.warn("   - EMAIL_FROM");
}

const sendEmail = async (to, subject, text, html = null) => {
  // Check if email is configured
  if (!hasEmailConfig) {
    console.warn("📧 Email not sent - email configuration not available");
    console.warn(`Would have sent to: ${to}`);
    console.warn(`Subject: ${subject}`);
    return { messageId: "no-email-config" };
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
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado para ${to}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);

    // Provide more specific error messages
    if (error.code === "EAUTH") {
      throw new Error(
        "Falha na autenticação SMTP. Verifique EMAIL_USER e EMAIL_PASS no arquivo .env"
      );
    } else if (error.code === "ECONNECTION") {
      throw new Error(
        "Falha na conexão com o servidor SMTP. Verifique a configuração de rede"
      );
    } else {
      throw new Error(`Erro ao enviar email: ${error.message}`);
    }
  }
};

export default sendEmail;
