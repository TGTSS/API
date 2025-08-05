// services/uploadService.js

import cloudinary from "cloudinary";

/**
 * Função para fazer upload de um arquivo em buffer para a Cloudinary
 * Use "export const" para que a função possa ser importada pelo nome.
 */
export const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
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

/**
 * Função para deletar um arquivo da Cloudinary usando seu public_id
 * Use "export const" aqui também.
 */
export const deleteFromCloudinary = (public_id) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.destroy(public_id, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });
};
