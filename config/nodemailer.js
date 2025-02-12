import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();  // Carrega as variáveis de ambiente

// Configuração do transportador de e-mail usando SendGrid
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",  // Servidor SMTP do SendGrid
  port: 465,  // Porta SSL (use 587 se estiver usando TLS)
  secure: true,  // Use SSL/TLS
  auth: {
    user: "apikey",  // Nome de usuário é sempre "apikey" no SendGrid
    pass: process.env.EMAIL_API_KEY,  // A chave da API do SendGrid
  },
});

export default transporter;