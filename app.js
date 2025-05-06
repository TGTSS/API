import express from "express";
import fs from "fs";
import path from "path";

const app = express();

// Criar diretório de uploads se não existir
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(uploadDir));

export default app;
