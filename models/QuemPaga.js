import mongoose from "mongoose";

const QuemPagaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
});

const QuemPaga = mongoose.model("QuemPaga", QuemPagaSchema);

export default QuemPaga;
