import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  permissao: { type: String, default: "Novo" },
  modulos: {
    type: Map,
    of: Boolean,
    default: {
      dashboard: false,
      recibos: false,
      fornecedores: false,
      clientes: false,
      funcionarios: false,
      insumos: false,
      composicoes: false,
      obras: false,
      financeiro: false,
      compras: false,
      usuarios: false,
    },
  },
});

const User = mongoose.model("User", userSchema);

export default User;
