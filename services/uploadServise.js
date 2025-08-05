import cloudinary from "cloudinary";

/**
 * Função para fazer upload de um arquivo em buffer para a Cloudinary
 * @param {Buffer} buffer O buffer do arquivo (vindo do req.file.buffer)
 * @param {string} folder A pasta na Cloudinary onde o arquivo será salvo
 * @returns {Promise<object>} O resultado do upload da Cloudinary
 */
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto", // Detecta o tipo de arquivo automaticamente
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export default uploadToCloudinary;
