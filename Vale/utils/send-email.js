import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Initialize Resend lazily or handle missing key to prevent crash at startup
let resend;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (err) {
  console.error("Erro ao inicializar Resend:", err.message);
}

const sendEmail = async (data) => {
  const { name, email, phone, message } = data;

  if (!name || !email || !phone || !message) {
    throw new Error(
      "Todos os campos (name, email, phone, message) são obrigatórios."
    );
  }

  if (!resend) {
    console.error("Tentativa de enviar email sem RESEND_API_KEY configurada.");
    throw new Error(
      "Serviço de email não configurado corretamente (chave ausente)."
    );
  }

  // Prioriza o e-mail de suporte para evitar bloqueios de "auto-envio"
  const emailFrom = process.env.VALE_EMAIL_USER
    ? process.env.VALE_EMAIL_USER.trim()
    : "suporte@valegnss.com.br";

  const recipient = process.env.VALE_EMAIL_TO
    ? process.env.VALE_EMAIL_TO.trim()
    : "orcamento@valegnss.com.br";

  console.log(`[Email Debug] De: ${emailFrom} | Para: ${recipient}`);

  const mailOptions = {
    from: `Vale GNSS <${emailFrom}>`,
    to: recipient,
    reply_to: email, // Email do cliente para resposta direta
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
    const { data: resData, error } = await resend.emails.send(mailOptions);

    if (error) {
      console.error("Erro ao enviar email via Resend:", error);
      throw new Error(`Falha ao enviar email via Resend: ${error.message}`);
    }

    console.log("Email enviado com sucesso via Resend:", resData.id);
    return { success: true, messageId: resData.id };
  } catch (error) {
    console.error("Erro inesperado ao enviar email:", error);
    throw new Error(`Erro inesperado ao enviar email: ${error.message}`);
  }
};

export default sendEmail;
