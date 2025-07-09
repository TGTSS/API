import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    "❌ Missing required environment variables for email configuration:"
  );
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error(
    "Please create a .env file with the required variables. See env.example for reference."
  );
  throw new Error(
    "Email configuration incomplete. Please check environment variables."
  );
}

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text, html = null) => {
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
