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

export default router;
