import User from "../models/User.js";
import Client from "../models/Client.js";
import { formatError } from "../utils/error-handler.js";

export const addUserClient = async (req, res) => {
  try {
    const { userId } = req.params;
    const { clientId } = req.body;

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado" });

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client)
      return res.status(404).json({ message: "Cliente não encontrado" });

    // Add to user.clients if not already there
    if (!user.clients.includes(clientId)) {
      user.clients.push(clientId);
      await user.save();
    }

    // Populate clients before returning
    await user.populate("clients");

    res.json(user);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const removeUserClient = async (req, res) => {
  try {
    const { userId, clientId } = req.params;

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado" });

    user.clients = user.clients.filter((id) => id.toString() !== clientId);
    await user.save();

    // Populate clients before returning
    await user.populate("clients");

    res.json(user);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getUserClients = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("clients");
    if (!user)
      return res.status(404).json({ message: "Usuário não encontrado" });

    res.json(user.clients);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json({ message: "Usuário excluído com sucesso", id: user._id });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
