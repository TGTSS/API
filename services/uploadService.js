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

export { uploadToCloudinary, deleteFromCloudinary };

/**
 * Função para deletar um arquivo da Cloudinary pelo public_id
 * @param {string} publicId O public_id do arquivo na Cloudinary
 * @returns {Promise<object>} O resultado da deleção da Cloudinary
 */
export const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.destroy(publicId, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
};
