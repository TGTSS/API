import sendEmail from "../Vale/utils/send-email.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env explicitamente
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runTest() {
  console.log("--- Iniciando Teste de Envio ---");
  console.log("Verificando variáveis de ambiente:");
  console.log(
    "RESEND_API_KEY:",
    process.env.RESEND_API_KEY ? "Configurada (OK)" : "AUSENTE"
  );
  console.log(
    "VALE_EMAIL_USER:",
    process.env.VALE_EMAIL_USER || "Não definida (usando padrão)"
  );
  console.log(
    "VALE_EMAIL_TO:",
    process.env.VALE_EMAIL_TO || "Não definida (usando padrão)"
  );

  const testData = {
    name: "Tiago Silva - Teste Debug",
    email: "tiagosilvaff18@gmail.com",
    phone: "84988672306",
    message:
      "Este é um teste de debug para verificar os logs e a integração com o Resend.",
  };

  try {
    const result = await sendEmail(testData);
    console.log("\n--- Resultado do Envio ---");
    console.log("Sucesso:", result.success);
    console.log("Message ID:", result.messageId);
    console.log(
      "\nAguarde alguns segundos e verifique o painel do Resend para ver o status real (Delivered ou Bounced)."
    );
  } catch (error) {
    console.error("\n--- ERRO NO TESTE ---");
    console.error(error.message);
  }
}

runTest();
