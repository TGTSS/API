import FinancialTransaction from "../models/FinancialTransaction.js";
import cloudinary from "../../cloudinary.js";
import { formatError } from "../utils/error-handler.js";

export const getTransactions = async (req, res) => {
  try {
    const transactions = await FinancialTransaction.find()
      .populate("projectId", "name code")
      .sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const uploadAttachments = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transação não encontrada" });

    const newAttachments = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      publicId: file.public_id,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    }));

    transaction.attachments.push(...newAttachments);
    await transaction.save();

    res.status(200).json(transaction.attachments);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteAttachment = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ message: "Transação não encontrada" });

    const attachment = transaction.attachments.id(req.params.attachmentId);
    if (!attachment)
      return res.status(404).json({ message: "Anexo não encontrado" });

    // Delete from Cloudinary
    if (attachment.publicId) {
      await cloudinary.uploader.destroy(attachment.publicId);
    }

    transaction.attachments.pull(req.params.attachmentId);
    await transaction.save();

    res.json({ message: "Anexo removido com sucesso" });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
