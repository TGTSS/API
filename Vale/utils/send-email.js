import nodemailer from "nodemailer";
import dotenv from "dotenv";

import path from "path";
import { fileURLToPath } from "url";

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from project root (2 levels up: Vale/utils -> Vale -> API)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Fallback/standard load
dotenv.config();

const sendEmail = async (data) => {
  const { name, email, phone, message } = data;

  if (!name || !email || !phone || !message) {
    throw new Error(
      "Todos os campos (name, email, phone, message) são obrigatórios."
    );
  }

  const emailUser = process.env.VALE_EMAIL_USER
    ? process.env.VALE_EMAIL_USER.trim()
    : "";
  const emailPass = process.env.VALE_EMAIL_PASS
    ? process.env.VALE_EMAIL_PASS.trim()
    : "";

  console.log("--- DEBUG SEND-EMAIL ---");
  console.log("CWD:", process.cwd());
  console.log("VALE_EMAIL_USER:", emailUser);
  console.log("VALE_EMAIL_PASS set:", !!emailPass);
  console.log(
    "All Env Keys:",
    Object.keys(process.env).filter((k) => k.startsWith("VALE_"))
  );
  console.log("------------------------");

  if (!emailUser || !emailPass) {
    throw new Error(
      `Credenciais de email não configuradas. User: '${emailUser}', Pass set: ${!!emailPass}`
    );
  }

  console.log("Tentando autenticação com:", emailUser);
  console.log("Comprimento da senha:", emailPass.length); // Verifique se o tamanho bate com sua senha

  const transporter = nodemailer.createTransport({
    host: "smtppro.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Formulário Site" <${process.env.VALE_EMAIL_USER}>`, // Remetente deve ser o email autenticado
    to: process.env.VALE_EMAIL_TO || process.env.VALE_EMAIL_USER, // Para quem vai o email (geralmente você mesmo)
    replyTo: email, // O email do cliente vai no reply-to
    subject: `Nova Solicitação de Cotação - ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background-color: #12243F; color: #ffffff; padding: 20px; text-align: center; border-bottom: 4px solid #1447E6; }
          .header h2 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .field { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .field:last-child { border-bottom: none; }
          .label { font-weight: bold; color: #1447E6; display: block; margin-bottom: 5px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
          .value { font-size: 16px; color: #555; }
          .footer { background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Nova Solicitação de Cotação</h2>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Nome do Cliente</span>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <span class="label">Email</span>
              <div class="value"><a href="mailto:${email}" style="color: #1447E6; text-decoration: none;">${email}</a></div>
            </div>
            <div class="field">
              <span class="label">Telefone</span>
              <div class="value">${phone}</div>
            </div>
            <div class="field">
              <span class="label">Mensagem</span>
              <div class="value" style="white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          <div class="footer">
            <p>Este email foi enviado através do formulário de contato do site Vale GNSS.</p>
            <p>© ${new Date().getFullYear()} Vale GNSS. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado com sucesso: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Erro ao enviar email via SMTP:", error);
    // Include the actual error message for debugging
    throw new Error(`Falha ao enviar email via SMTP: ${error.message}`);
  }
};

export default sendEmail;
