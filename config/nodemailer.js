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
  process.exit(1);
}

console.log("✅ Email configuration loaded successfully");
console.log("USER:", process.env.EMAIL_USER);
console.log("FROM:", process.env.EMAIL_FROM);

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test the transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP server is ready to send emails");
  }
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
