import express from "express";
import fs from "fs";
import path from "path";

const app = express();

// Criar diretório de uploads se não existir
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ...existing code...
app.use("/uploads", express.static(uploadDir));
// ...existing code...
