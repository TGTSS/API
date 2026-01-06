export const formatError = (error) => {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err) => err.message);
    return {
      status: 400,
      message: "Erro de validação nos campos preenchidos.",
      errors: messages,
    };
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const fieldNames = {
      code: "Código",
      email: "E-mail",
      document: "Documento/CPF/CNPJ",
      phone: "Telefone",
    };
    return {
      status: 400,
      message: `Já existe um registro com este ${fieldNames[field] || field}.`,
    };
  }

  if (error.name === "CastError") {
    return {
      status: 400,
      message: `ID inválido fornecido para o campo ${error.path}.`,
    };
  }

  return {
    status: 500,
    message: error.message || "Ocorreu um erro inesperado no servidor.",
  };
};
