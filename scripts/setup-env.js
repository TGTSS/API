#!/usr/bin/env node

/**
 * Script para configurar variáveis de ambiente
 * Execute este script para verificar e configurar as variáveis necessárias
 */

import fs from "fs";
import path from "path";

console.log("🔧 Configuração de Variáveis de Ambiente");
console.log("==========================================");

// Verificar se o arquivo .env existe
const envPath = path.join(process.cwd(), ".env");
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log("📝 Criando arquivo .env...");

  const envContent = `# Email Configuration (SMTP Hostinger)
# Descomente e configure estas variáveis se quiser usar email
# EMAIL_USER=your_email@yourdomain.com
# EMAIL_PASS=your_app_password
# EMAIL_FROM=your_email@yourdomain.com

# MongoDB Configuration
MONGO_URI=mongodb://Nexus_wayfallpan:84e7091321e8c8bbdd74986f5dadd8abf919018e@5f7qa.h.filess.io:27018/Nexus_wayfallpan

# Node Environment
NODE_ENV=production

# Other environment variables can be added here
`;

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Arquivo .env criado com sucesso!");
} else {
  console.log("✅ Arquivo .env já existe");
}

// Verificar variáveis de ambiente atuais
console.log("\n📊 Status das Variáveis de Ambiente:");
console.log("=====================================");

const requiredVars = [
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_FROM",
  "MONGO_URI",
  "NODE_ENV",
];

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes("PASS") ? "***" : value}`);
  } else {
    console.log(`❌ ${varName}: Não configurado`);
  }
});

console.log("\n📋 Instruções:");
console.log("==============");
console.log(
  "1. Para configurar email, edite o arquivo .env e descomente as linhas EMAIL_*"
);
console.log("2. Configure suas credenciais de email SMTP");
console.log("3. O sistema funcionará sem email, mas não enviará lembretes");
console.log(
  "4. Para produção no Render, configure as variáveis no painel do Render"
);

console.log("\n🚀 O servidor deve iniciar normalmente agora!");
