import TeamMember from "../models/TeamMember.js";
import Project from "../models/Project.js";
import cloudinary from "../../cloudinary.js";
import { formatError } from "../utils/error-handler.js";

export const getTeam = async (req, res) => {
  try {
    const team = await TeamMember.find().sort({ name: 1 });
    const teamWithStats = await Promise.all(
      team.map(async (member) => {
        const projectCount = await Project.countDocuments({
          technicalLead: member.name,
        });
        return {
          ...member.toObject(),
          projects: projectCount,
        };
      })
    );

    res.json(teamWithStats);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const createTeamMember = async (req, res) => {
  try {
    const existing = await TeamMember.findOne({ email: req.body.email });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Email já cadastrado na equipe." });
    }

    let avatar = req.body.name.charAt(0).toUpperCase();
    let avatarPublicId = null;

    if (req.file) {
      avatar = req.file.path;
      avatarPublicId = req.file.public_id;
    }

    const member = new TeamMember({
      ...req.body,
      avatar,
      avatarPublicId,
    });
    await member.save();
    res.status(201).json(member);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    const existingMember = await TeamMember.findById(req.params.id);
    if (!existingMember)
      return res.status(404).json({ message: "Membro não encontrado" });

    const updateData = { ...req.body };

    if (req.file) {
      if (existingMember.avatarPublicId) {
        await cloudinary.uploader.destroy(existingMember.avatarPublicId);
      }
      updateData.avatar = req.file.path;
      updateData.avatarPublicId = req.file.public_id;
    }

    const member = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
      }
    );
    if (!member)
      return res.status(404).json({ message: "Membro não encontrado" });
    res.json(member);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member)
      return res.status(404).json({ message: "Membro não encontrado" });

    if (member.avatarPublicId) {
      await cloudinary.uploader.destroy(member.avatarPublicId);
    }

    res.json({ message: "Membro removido com sucesso." });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
