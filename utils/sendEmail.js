import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

let emailConfigured = true;

if (missingVars.length > 0) {
  console.warn(
    "⚠️  Missing required environment variables for email configuration:"
  );
  missingVars.forEach((varName) => console.warn(`   - ${varName}`));
  console.warn(
    "Email functionality will be disabled. Please create a .env file with the required variables. See env.example for reference."
  );
  emailConfigured = false;
}

let transporter = null;

if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const sendEmail = async (to, subject, text, html = null) => {
  // Check if email is configured
  if (!emailConfigured) {
    console.warn("⚠️  Email not configured. Skipping email send.");
    return { messageId: "email-disabled", status: "skipped" };
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
