import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // seu email
    pass: process.env.EMAIL_PASS, // sua senha
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Erro ao conectar ao servidor SMTP:", error);
  } else {
    console.log("Servidor SMTP conectado com sucesso:", success);
  }
});

export default transporter;
