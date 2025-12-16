import express from "express";
import sendEmail from "../utils/send-email.js";

const router = express.Router();

router.post("/send-quote", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // Call the utility function to send email via SMTP
    await sendEmail({ name, email, phone, message });

    return res.status(200).json({ success: true, message: "Cotação solicitada com sucesso!" });
  } catch (error) {
    console.error("Erro na rota /send-quote:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/test", async (req, res) => {
  try {
    const testData = {
      name: "Teste de Verificação API",
      email: "teste@valegnss.com",
      phone: "(00) 0000-0000",
      message: "Este é um teste automático para validar a configuração de envio de e-mails da API Vale."
    };

    await sendEmail(testData);

    return res.status(200).json({ 
      success: true, 
      message: "Teste realizado com sucesso! Verifique sua caixa de entrada." 
    });
  } catch (error) {
    console.error("Erro na rota de teste:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Erro ao enviar email de teste",
      error: error.message 
    });
  }
});

export default router;
