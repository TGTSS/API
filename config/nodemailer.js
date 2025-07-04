import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log("USER:", process.env.EMAIL_USER);
console.log("PASS:", process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail(
  {
    from: process.env.EMAIL_FROM,
    to: "modernaedificacoes@gmail.com",
    subject: "Teste SMTP Hostinger - " + new Date().toLocaleString(),
    text: "Este é um teste de envio para outro destinatário.",
    html: "<p>Este é um teste de envio para outro destinatário.</p>",
  },
  (err, info) => {
    if (err) {
      console.error("Erro:", err);
    } else {
      console.log("Enviado:", info);
    }
  }
);

export default transporter;
