import mongoose from "mongoose";
import dotenv from "dotenv";
import { runDailyReminders } from "../services/scheduler.js";

dotenv.config();

async function testScheduler() {
  console.log("🧪 Testando scheduler...");

  try {
    // Conectar ao MongoDB
    console.log("🔌 Conectando ao MongoDB...");
    await mongoose.connect(
      "mongodb://Nexus_wayfallpan:84e7091321e8c8bbdd74986f5dadd8abf919018e@5f7qa.h.filess.io:27018/Nexus_wayfallpan",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ MongoDB conectado");

    // Testar o scheduler
    console.log("🔄 Executando teste do scheduler...");
    await runDailyReminders();

    console.log("✅ Teste do scheduler concluído!");
  } catch (error) {
    console.error("❌ Erro no teste do scheduler:", error);
    console.error("🔍 Stack trace:", error.stack);
  } finally {
    // Fechar conexão
    await mongoose.connection.close();
    console.log("🔌 Conexão MongoDB fechada");
    process.exit(0);
  }
}

// Executar o teste
testScheduler();
