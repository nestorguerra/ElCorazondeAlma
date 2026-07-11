import {
  DEFAULT_VITALS,
  getDisease,
  type Disease,
  type DiseaseId,
  type Vitals,
} from "./simulation.ts";
import type { EcgLead } from "./vtModel.ts";

export type ScenarioMode = "explore" | "guided";
export type GuidedStep = 1 | 2 | 3;

export type ScenarioState = {
  diseaseId: DiseaseId;
  specificValue: number;
  vitals: Vitals;
  lead: EcgLead;
  compareHealthy: boolean;
  mode: ScenarioMode;
  guidedStep: GuidedStep;
};

export type DiseaseControlConfig = {
  kind: "continuous" | "discrete";
  note?: string;
  options?: Array<{ value: number; label: string; shortLabel: string }>;
};

export const DEFAULT_SCENARIO: ScenarioState = {
  diseaseId: "healthy",
  specificValue: 0,
  vitals: DEFAULT_VITALS,
  lead: "DII",
  compareHealthy: false,
  mode: "explore",
  guidedStep: 1,
};

const CONTROL_CONFIG: Partial<Record<DiseaseId, DiseaseControlConfig>> = {
  afib: {
    kind: "continuous",
    note: "Índice didáctico de variabilidad; no cuantifica la carga clínica de fibrilación auricular.",
  },
  "av-block": {
    kind: "discrete",
    options: [
      { value: 1, label: "Bloqueo AV de primer grado", shortLabel: "1.º" },
      { value: 2, label: "Mobitz I (Wenckebach)", shortLabel: "Mobitz I" },
      { value: 3, label: "Mobitz II", shortLabel: "Mobitz II" },
      { value: 4, label: "Bloqueo AV completo", shortLabel: "Completo" },
    ],
  },
  ischemia: {
    kind: "continuous",
    note: "Reducción de flujo simulada; no equivale a una medición invasiva de flujo coronario.",
  },
  infarction: {
    kind: "continuous",
    note: "Escenario docente de oclusión persistente de la descendente anterior sin reperfusión.",
  },
  pericarditis: {
    kind: "continuous",
    note: "Expresión didáctica del patrón ECG; no gradúa la gravedad clínica de la pericarditis.",
  },
};

const VALID_LEADS: EcgLead[] = ["DII", "V2", "V5"];
const VALID_DISEASES = new Set<DiseaseId>([
  "healthy",
  "afib",
  "vt",
  "av-block",
  "ischemia",
  "infarction",
  "heart-failure",
  "aortic-stenosis",
  "mitral-regurgitation",
  "pericarditis",
  "hcm",
]);

export function getDiseaseControlConfig(
  disease: Disease,
): DiseaseControlConfig {
  return CONTROL_CONFIG[disease.id] ?? { kind: "continuous" };
}

export function normalizeSpecificValue(disease: Disease, value: number) {
  const finite = Number.isFinite(value) ? value : disease.specific.defaultValue;
  const clamped = Math.min(
    disease.specific.max,
    Math.max(disease.specific.min, finite),
  );
  const stepped =
    Math.round((clamped - disease.specific.min) / disease.specific.step) *
      disease.specific.step +
    disease.specific.min;
  return Number(
    Math.min(disease.specific.max, Math.max(disease.specific.min, stepped)).toFixed(4),
  );
}

export function specificToSeverity(disease: Disease, value: number) {
  if (disease.id === "healthy") return 0;
  const normalized = normalizeSpecificValue(disease, value);
  const fraction =
    (normalized - disease.specific.min) /
    Math.max(0.0001, disease.specific.max - disease.specific.min);
  const severityFraction = disease.specific.inverse ? 1 - fraction : fraction;
  return Math.round(Math.min(1, Math.max(0, severityFraction)) * 100);
}

export function severityToSpecific(disease: Disease, severity: number) {
  if (disease.id === "healthy") return 0;
  const visualFraction = Math.min(1, Math.max(0, severity / 100));
  const specificFraction = disease.specific.inverse
    ? 1 - visualFraction
    : visualFraction;
  return normalizeSpecificValue(
    disease,
    disease.specific.min +
      (disease.specific.max - disease.specific.min) * specificFraction,
  );
}

export function getScenarioLandmarks(disease: Disease) {
  if (disease.id === "healthy") return [];
  const values = disease.specific.inverse
    ? [
        disease.specific.max,
        disease.specific.defaultValue,
        disease.specific.min,
      ]
    : [
        disease.specific.min,
        disease.specific.defaultValue,
        disease.specific.max,
      ];
  return ["Menor cambio", "Escenario", "Mayor cambio"].map((label, index) => ({
    label,
    value: normalizeSpecificValue(disease, values[index]),
  }));
}

function numberParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function parseScenarioSearch(search: string): ScenarioState {
  const params = new URLSearchParams(search);
  const version = params.get("v");
  if (version !== null && version !== "1") {
    return {
      ...DEFAULT_SCENARIO,
      vitals: { ...DEFAULT_SCENARIO.vitals },
    };
  }
  const requestedDisease = params.get("d") as DiseaseId | null;
  const diseaseId =
    requestedDisease && VALID_DISEASES.has(requestedDisease)
      ? requestedDisease
      : DEFAULT_SCENARIO.diseaseId;
  const disease = getDisease(diseaseId);
  const specificValue = normalizeSpecificValue(
    disease,
    numberParam(
      params,
      "x",
      disease.specific.defaultValue,
      disease.specific.min,
      disease.specific.max,
    ),
  );
  const leadParam = params.get("lead") as EcgLead | null;
  const step = Math.round(numberParam(params, "step", 1, 1, 3)) as GuidedStep;

  const requestedSystolic = Math.round(
    numberParam(params, "sys", DEFAULT_VITALS.systolic, 80, 210),
  );
  const requestedDiastolic = Math.round(
    numberParam(params, "dia", DEFAULT_VITALS.diastolic, 45, 125),
  );
  const systolic = Math.max(requestedSystolic, requestedDiastolic + 15);
  const diastolic = Math.min(requestedDiastolic, systolic - 15);

  return {
    diseaseId,
    specificValue: disease.id === "healthy" ? 0 : specificValue,
    vitals: {
      ...DEFAULT_VITALS,
      heartRate: Math.round(numberParam(params, "hr", DEFAULT_VITALS.heartRate, 40, 160)),
      systolic: Math.min(210, systolic),
      diastolic: Math.max(45, diastolic),
      spo2: Math.round(numberParam(params, "spo2", DEFAULT_VITALS.spo2, 78, 100)),
      temperature: Number(
        numberParam(params, "temp", DEFAULT_VITALS.temperature, 35, 41).toFixed(1),
      ),
    },
    lead: leadParam && VALID_LEADS.includes(leadParam) ? leadParam : "DII",
    compareHealthy: params.get("compare") === "1" && disease.id !== "healthy",
    mode: params.get("mode") === "guided" ? "guided" : "explore",
    guidedStep: step,
  };
}

export function serializeScenarioSearch(state: ScenarioState) {
  const params = new URLSearchParams();
  params.set("v", "1");
  params.set("d", state.diseaseId);
  if (state.diseaseId !== "healthy") params.set("x", String(state.specificValue));
  params.set("hr", String(state.vitals.heartRate));
  params.set("sys", String(state.vitals.systolic));
  params.set("dia", String(state.vitals.diastolic));
  params.set("spo2", String(state.vitals.spo2));
  params.set("temp", state.vitals.temperature.toFixed(1));
  params.set("lead", state.lead);
  if (state.compareHealthy && state.diseaseId !== "healthy") params.set("compare", "1");
  if (state.mode === "guided") {
    params.set("mode", "guided");
    params.set("step", String(state.guidedStep));
  }
  return params.toString();
}
