import fs from "fs";
import path from "path";
import Certificado from "../models/Certificado.js";
import Cliente from "../models/Cliente.js";

export const importarCertificadoPFX = async (clienteId, pfxPath, senha) => {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(pfxPath)) {
      throw new Error(`Arquivo PFX não encontrado: ${pfxPath}`);
    }

    // Ler o arquivo PFX e converter para base64
    const pfxBuffer = fs.readFileSync(pfxPath);
    const certificadoBase64 = pfxBuffer.toString("base64");

    // Buscar o cliente para obter CNPJ
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      throw new Error("Cliente não encontrado");
    }

    // Extrair CNPJ do nome do arquivo (assumindo que o nome do arquivo contém o CNPJ)
    const cnpj = cliente.cnpj || clienteId;

    // Criar novo certificado no banco
    const certificado = new Certificado({
      empresa: clienteId,
      cnpj: cnpj,
      ufAutor: "24", // UF de Santa Catarina
      certificadoBase64: certificadoBase64,
      senha: senha,
      dataValidade: new Date("2024-12-31"), // Você deve ajustar para a data real de validade
      ativo: true,
    });

    await certificado.save();
    return certificado;
  } catch (error) {
    console.error("Erro ao importar certificado:", error);
    throw error;
  }
};
