import CalendarEvent from "../models/CalendarEvent.js";

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
    console.error("Erro em getEvents:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar eventos.", error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const event = new CalendarEvent(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error("Erro em createEvent:", error);
    res
      .status(500)
      .json({ message: "Erro ao criar evento.", error: error.message });
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
    console.error("Erro em updateEvent:", error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar evento.", error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event)
      return res.status(404).json({ message: "Evento não encontrado" });
    res.json({ message: "Evento removido com sucesso." });
  } catch (error) {
    console.error("Erro em deleteEvent:", error);
    res
      .status(500)
      .json({ message: "Erro ao excluir evento.", error: error.message });
  }
};
