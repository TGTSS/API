import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const sendEmail = async (data) => {
  const { name, email, phone, message } = data;

  if (!name || !email || !phone || !message) {
    throw new Error("Todos os campos (name, email, phone, message) são obrigatórios.");
  }

  // Configuração do transporter com as credenciais do Zoho (conforme imagem fornecida)
  const transporter = nodemailer.createTransport({
    host: "smtppro.zoho.com",
    port: 465,
    secure: true, // true para 465, false para outras portas
    auth: {
      user: process.env.VALE_EMAIL_USER, // Seu email Zoho
      pass: process.env.VALE_EMAIL_PASS, // Sua senha Zoho
    },
  });

  const mailOptions = {
    from: `"Formulário Site" <${process.env.VALE_EMAIL_USER}>`, // Remetente deve ser o email autenticado
    to: process.env.VALE_EMAIL_TO || process.env.VALE_EMAIL_USER, // Para quem vai o email (geralmente você mesmo)
    replyTo: email, // O email do cliente vai no reply-to
    subject: `Nova Solicitação de Cotação - ${name}`,
    html: `
      <h3>Nova Solicitação de Cotação - Site Vale</h3>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Telefone:</strong> ${phone}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${message}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado com sucesso: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Erro ao enviar email via SMTP:", error);
    throw new Error("Falha ao enviar email via SMTP");
  }
};

export default sendEmail;
