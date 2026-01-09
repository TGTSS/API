import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Schema para itens dinâmicos (outros equipamentos e outros indiretos)
const DynamicItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { _id: true }
);

// Schema para itens de custo com ativação, quantidade/dias e taxa
const CostItemSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    days: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    distance: { type: Number, default: 0 }, // Para gasolina (km)
    rate: { type: Number, default: 0 },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    projectId: {
      type: String,
      ref: "ValeProject",
      required: [true, "O projeto é obrigatório"],
      unique: true,
    },

    // =====================
    // CUSTOS OPERACIONAIS
    // =====================

    // Mão de obra
    tecnico: {
      type: CostItemSchema,
      default: () => ({ active: false, days: 0, rate: 0 }),
    },
    auxiliar: {
      type: CostItemSchema,
      default: () => ({ active: false, days: 0, rate: 0 }),
    },
    ajudante: {
      type: CostItemSchema,
      default: () => ({ active: false, days: 0, rate: 0 }),
    },

    // Logística
    alimentacao: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },
    marco: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },
    placa: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },
    gasolina: {
      type: CostItemSchema,
      default: () => ({ active: false, distance: 0, rate: 0 }),
    },
    lavagem: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },
    art: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },

    // =====================
    // EQUIPAMENTOS
    // =====================
    rtk: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },
    droneMatrice: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },
    droneMini: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },
    estacaoTotal: {
      type: CostItemSchema,
      default: () => ({ active: false, quantity: 0, rate: 0 }),
    },

    // Outros equipamentos (dinâmico)
    outrosEquipamentos: [DynamicItemSchema],

    // =====================
    // CUSTOS INDIRETOS
    // =====================
    projetoTecnico: {
      type: CostItemSchema,
      default: () => ({ active: false, rate: 0 }),
    },
    memorialDescritivo: {
      type: CostItemSchema,
      default: () => ({ active: false, rate: 0 }),
    },

    // Outros indiretos (dinâmico)
    outrosIndiretos: [DynamicItemSchema],

    // =====================
    // STATUS E CONTROLE
    // =====================
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected"],
      default: "draft",
    },
    sentForApprovalAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    clientNotes: { type: String },

    // =====================
    // SUBTOTAIS E TOTAL (calculados automaticamente)
    // =====================
    subtotalOperational: { type: Number, default: 0 },
    subtotalEquipment: { type: Number, default: 0 },
    subtotalIndirect: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Middleware para calcular subtotais antes de salvar
budgetSchema.pre("save", function (next) {
  // =====================
  // CUSTOS OPERACIONAIS
  // =====================

  // Mão de obra (dias * taxa)
  const custoTecnico = this.tecnico?.active
    ? (this.tecnico.days || 0) * (this.tecnico.rate || 0)
    : 0;
  const custoAuxiliar = this.auxiliar?.active
    ? (this.auxiliar.days || 0) * (this.auxiliar.rate || 0)
    : 0;
  const custoAjudante = this.ajudante?.active
    ? (this.ajudante.days || 0) * (this.ajudante.rate || 0)
    : 0;

  // Logística (quantidade * taxa ou distância * taxa)
  const custoAlimentacao = this.alimentacao?.active
    ? (this.alimentacao.quantity || 0) * (this.alimentacao.rate || 0)
    : 0;
  const custoMarco = this.marco?.active
    ? (this.marco.quantity || 0) * (this.marco.rate || 0)
    : 0;
  const custoPlaca = this.placa?.active
    ? (this.placa.quantity || 0) * (this.placa.rate || 0)
    : 0;
  const custoGasolina = this.gasolina?.active
    ? (this.gasolina.distance || 0) * (this.gasolina.rate || 0)
    : 0;
  const custoLavagem = this.lavagem?.active
    ? (this.lavagem.quantity || 0) * (this.lavagem.rate || 0)
    : 0;
  const custoArt = this.art?.active
    ? (this.art.quantity || 0) * (this.art.rate || 0)
    : 0;

  this.subtotalOperational =
    custoTecnico +
    custoAuxiliar +
    custoAjudante +
    custoAlimentacao +
    custoMarco +
    custoPlaca +
    custoGasolina +
    custoLavagem +
    custoArt;

  // =====================
  // EQUIPAMENTOS
  // =====================
  const custoRtk = this.rtk?.active
    ? (this.rtk.quantity || 0) * (this.rtk.rate || 0)
    : 0;
  const custoDroneMatrice = this.droneMatrice?.active
    ? (this.droneMatrice.quantity || 0) * (this.droneMatrice.rate || 0)
    : 0;
  const custoDroneMini = this.droneMini?.active
    ? (this.droneMini.quantity || 0) * (this.droneMini.rate || 0)
    : 0;
  const custoEstacaoTotal = this.estacaoTotal?.active
    ? (this.estacaoTotal.quantity || 0) * (this.estacaoTotal.rate || 0)
    : 0;

  const outrosEquipTotal = (this.outrosEquipamentos || []).reduce(
    (sum, item) => sum + (item.value || 0),
    0
  );

  this.subtotalEquipment =
    custoRtk +
    custoDroneMatrice +
    custoDroneMini +
    custoEstacaoTotal +
    outrosEquipTotal;

  // =====================
  // CUSTOS INDIRETOS
  // =====================
  const custoProjetoTecnico = this.projetoTecnico?.active
    ? this.projetoTecnico.rate || 0
    : 0;
  const custoMemorialDescritivo = this.memorialDescritivo?.active
    ? this.memorialDescritivo.rate || 0
    : 0;

  const outrosIndiretosTotal = (this.outrosIndiretos || []).reduce(
    (sum, item) => sum + (item.value || 0),
    0
  );

  this.subtotalIndirect =
    custoProjetoTecnico + custoMemorialDescritivo + outrosIndiretosTotal;

  // =====================
  // TOTAL GERAL
  // =====================
  this.total =
    this.subtotalOperational + this.subtotalEquipment + this.subtotalIndirect;

  next();
});

budgetSchema.index({ projectId: 1 });

const Budget = mongoose.model("ValeBudget", budgetSchema);
export default Budget;
