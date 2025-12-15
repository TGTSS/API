// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// 1. Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Função para criar storage personalizado
const createStorage = (folder, options = {}) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `obras/${folder}`, // Organizar por pastas
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
      ],
      resource_type: "auto", // Detecta automaticamente o tipo
      ...options,
    },
  });
};

// 3. Configurações específicas para cada tipo de upload
export const uploadImagem = multer({
  storage: createStorage("imagens", {
    transformation: [
      { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
    ],
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadDocumento = multer({
  storage: createStorage("documentos"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadRegistroDiario = multer({
  storage: createStorage("registros-diarios", {
    transformation: [
      { width: 800, height: 600, crop: "limit", quality: "auto:good" },
    ],
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadMedicao = multer({
  storage: createStorage("medicoes", {
    resource_type: "auto",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "mp4",
      "avi",
      "mov",
      "wmv",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
    ],
    transformation: [
      { width: 1280, height: 720, crop: "limit", quality: "auto:good" }, // HD quality for medições
    ],
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (better video support)
});

// 4. Função para deletar arquivos
export const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Erro ao deletar arquivo:", error);
    throw error;
  }
};

// 5. Função para extrair public_id da URL
export const getPublicId = (url) => {
  if (!url) return null;
  const matches = url.match(/\/v\d+\/(.+)\.[^.]+$/);
  return matches ? matches[1] : null;
};

export default cloudinary;
