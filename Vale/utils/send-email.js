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
    reply_to: email,
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
    if (error) throw new Error(error.message);
    return { success: true, messageId: resData.id };
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
};

/**
 * Envia e-mail de convite para o cliente criar acesso ao portal
 */
export const sendInviteEmail = async (client, inviteCode) => {
  if (!resend) {
    throw new Error("Serviço de email não configurado.");
  }

  const emailFrom = process.env.VALE_EMAIL_USER
    ? process.env.VALE_EMAIL_USER.trim()
    : "suporte@valegnss.com.br";

  const inviteLink = `https://valegnss.com.br/portal/activate?code=${inviteCode}`;

  const mailOptions = {
    from: `Vale GNSS <${emailFrom}>`,
    to: client.email,
    subject: "Convite: Acesso ao Portal do Cliente - Vale GNSS",
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f0f2f5; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background-color: #12243F; color: #ffffff; padding: 40px 20px; text-align: center; border-bottom: 5px solid #1447E6; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px; text-align: center; }
    .content p { font-size: 16px; margin-bottom: 25px; color: #4a5568; }
    .btn-container { margin: 35px 0; }
    .btn { background-color: #1447E6; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px; display: inline-block; transition: background-color 0.3s; }
    .code-box { background-color: #f7fafc; border: 2px dashed #cbd5e0; padding: 15px; margin: 25px 0; border-radius: 8px; }
    .code { font-family: monospace; font-size: 24px; font-weight: bold; color: #12243F; letter-spacing: 4px; }
    .footer { background-color: #f8fafc; padding: 25px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #edf2f7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Seja bem-vindo à Vale GNSS</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${client.name}</strong>!</p>
      <p>Você foi convidado a acessar o nosso Portal do Cliente, onde poderá acompanhar o progresso de seus projetos, visualizar medições e documentos em tempo real.</p>
      
      <div class="btn-container">
        <a href="${inviteLink}" class="btn">Ativar Meu Acesso</a>
      </div>

      <p>Se preferir, utilize o código de ativação abaixo no portal:</p>
      <div class="code-box">
        <span class="code">${inviteCode}</span>
      </div>

      <p style="font-size: 14px; color: #a0aec0;">Este convite expira em 7 dias.</p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático, por favor não responda.</p>
      <p>© ${new Date().getFullYear()} Vale GNSS - Tecnologia e Precisão em Agrimensura.</p>
    </div>
  </div>
</body>
</html>
    `,
  };

  try {
    const { data: resData, error } = await resend.emails.send(mailOptions);
    if (error) throw new Error(error.message);
    return { success: true, messageId: resData.id };
  } catch (error) {
    console.error("Erro ao enviar convite por e-mail:", error);
    throw error;
  }
};

export default sendEmail;
