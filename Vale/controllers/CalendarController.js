import CalendarEvent from "../models/CalendarEvent.js";
import { formatError } from "../utils/error-handler.js";

export const getEvents = async (req, res) => {
  try {
    const { start, end, assignedTo, projectId } = req.query;
    const query = {};

    if (start && end) {
      query.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    if (assignedTo) query.assignedTo = assignedTo;
    if (projectId) query.projectId = projectId;

    const events = await CalendarEvent.find(query)
      .populate("assignedTo", "name")
      .populate("projectId", "name code")
      .sort({ date: 1, time: 1 });

    res.json(events);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const createEvent = async (req, res) => {
  try {
    const event = new CalendarEvent(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    if (!event)
      return res.status(404).json({ message: "Evento não encontrado" });
    res.json(event);
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event)
      return res.status(404).json({ message: "Evento não encontrado" });
    res.json({ message: "Evento removido com sucesso." });
  } catch (error) {
    const formatted = formatError(error);
    res.status(formatted.status).json(formatted);
  }
};
