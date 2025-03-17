import { useNavigate } from "react-router-dom";

const handleSave = async (id, stages, clima, titulo, descricao, fotos) => {
  const navigate = useNavigate();

  try {
    // Transform stages into the format expected by the schema
    const etapas = stages.map((stage) => ({
      id: stage.id,
      nome: stage.title,
      progresso: stage.progress,
      subetapas:
        stage.subStages?.map((substage) => ({
          nome: substage.name,
          progresso: substage.progress || 0,
        })) || [],
    }));

    const registro = {
      data: new Date(),
      clima,
      titulo,
      descricao,
      fotos,
      etapas,
    };

    const response = await fetch(
      `https://api-urh2.onrender.com/api/obras/${id}/registros-diarios`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registro }),
      }
    );

    if (response.ok) {
      navigate(`/diario-obras/${id}`);
    } else {
      console.error("Erro ao salvar registro diário");
    }
  } catch (error) {
    console.error("Erro ao salvar registro diário:", error);
  }
};

export default handleSave;
