export type DiseaseId =
  | "afib"
  | "vt"
  | "av-block"
  | "ischemia"
  | "infarction"
  | "heart-failure"
  | "aortic-stenosis"
  | "mitral-regurgitation"
  | "pericarditis"
  | "hcm";

export type EcgPattern =
  | "afib"
  | "vt"
  | "av-block"
  | "ischemia"
  | "infarction"
  | "heart-failure"
  | "aortic-stenosis"
  | "mitral-regurgitation"
  | "pericarditis"
  | "hcm";

export type RegionId =
  | "atria"
  | "ventricles"
  | "av-node"
  | "anterior-lv"
  | "left-ventricle"
  | "aortic-valve"
  | "mitral-valve"
  | "pericardium"
  | "septum";

export type Disease = {
  id: DiseaseId;
  code: string;
  name: string;
  family: string;
  color: string;
  region: RegionId;
  regionLabel: string;
  pattern: EcgPattern;
  summary: string;
  heartLesson: string;
  ecgLesson: string;
  causalLesson: string;
  caveat: string;
  rhythmLabel: string;
  qrsLabel: string;
  stLabel: string;
  mechanicalLoss: number;
  progressionRate: number;
  timeUnit: "min" | "días" | "meses" | "años";
  specific: {
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit: string;
    inverse?: boolean;
  };
};

export type Vitals = {
  heartRate: number;
  temperature: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  ldl: number;
  viscosity: number;
};

export type DerivedSimulation = {
  severity: number;
  heartRate: number;
  map: number;
  currentSystolic: number;
  currentDiastolic: number;
  strokeVolume: number;
  cardiacOutput: number;
  ejectionFraction: number;
  contractility: number;
  rhythmIrregularity: number;
  riskIndex: number;
  riskMultiplier: number;
  stability: "Compensado" | "Vigilancia" | "Inestable";
  stabilityTone: "stable" | "watch" | "danger";
  activeRisks: string[];
};

export const DEFAULT_VITALS: Vitals = {
  heartRate: 72,
  temperature: 36.8,
  systolic: 118,
  diastolic: 76,
  spo2: 98,
  ldl: 92,
  viscosity: 1,
};

export const DISEASES: Disease[] = [
  {
    id: "afib",
    code: "FA",
    name: "Fibrilación auricular",
    family: "Ritmo",
    color: "#ad8bff",
    region: "atria",
    regionLabel: "ambas aurículas",
    pattern: "afib",
    summary:
      "Las aurículas se activan de forma caótica y pierden su contracción coordinada.",
    heartLesson:
      "Las aurículas pierden su contracción útil y muestran actividad fibrilatoria fina. Los ventrículos siguen contrayéndose de forma coordinada, pero a intervalos y con una fuerza variables.",
    ecgLesson:
      "Busca tres claves juntas: intervalos R–R sin patrón repetitivo, ausencia de ondas P definidas y una línea de base con ondas fibrilatorias finas, más visibles en V2.",
    causalLesson:
      "El nodo AV filtra la activación auricular caótica. Cada intervalo de llenado es distinto: un R–R corto suele producir un latido más débil; una respuesta rápida reduce aún más el llenado.",
    caveat:
      "La FA no tiene una ‘severidad eléctrica’ lineal. Este escenario separa frecuencia ventricular e impacto hemodinámico; el diagnóstico real requiere documentar el ritmo en un ECG.",
    rhythmLabel: "Irregularmente irregular",
    qrsLabel: "Habitualmente estrecho",
    stLabel: "Sin patrón específico",
    mechanicalLoss: 0,
    progressionRate: 0.04,
    timeUnit: "meses",
    specific: {
      label: "Variabilidad R–R (didáctica)",
      min: 35,
      max: 90,
      step: 1,
      defaultValue: 70,
      unit: "%",
    },
  },
  {
    id: "vt",
    code: "TV",
    name: "Taquicardia ventricular",
    family: "Ritmo",
    color: "#ff665f",
    region: "ventricles",
    regionLabel: "ambos ventrículos",
    pattern: "vt",
    summary:
      "Los ventrículos toman el control con un ritmo rápido y poco eficaz.",
    heartLesson:
      "Observa la contracción ventricular acelerada, el llenado reducido y la pérdida de volumen expulsado.",
    ecgLesson:
      "Busca una taquicardia regular con complejos QRS anchos y repetitivos.",
    causalLesson:
      "Cuanto más rápida es la frecuencia, menos tiempo queda para el llenado y más puede caer el gasto cardíaco.",
    caveat:
      "Escenario de emergencia. No toda taquicardia de QRS ancho es necesariamente ventricular.",
    rhythmLabel: "Regular, ventricular",
    qrsLabel: "Ancho >120 ms",
    stLabel: "No valorable",
    mechanicalLoss: 0.54,
    progressionRate: 0.28,
    timeUnit: "min",
    specific: {
      label: "Frecuencia ventricular",
      min: 110,
      max: 220,
      step: 1,
      defaultValue: 162,
      unit: "lpm",
    },
  },
  {
    id: "av-block",
    code: "BAV",
    name: "Bloqueo auriculoventricular",
    family: "Conducción",
    color: "#56d9e9",
    region: "av-node",
    regionLabel: "nodo AV y sistema de conducción",
    pattern: "av-block",
    summary:
      "La señal auricular se retrasa o deja de llegar correctamente a los ventrículos.",
    heartLesson:
      "Compara el ritmo auricular con el ventricular: algunas activaciones no producen contracción ventricular.",
    ecgLesson:
      "Sigue cada onda P y comprueba si aparece el QRS que debería seguirla.",
    causalLesson:
      "Al perder latidos conducidos, la frecuencia ventricular y el gasto pueden caer aunque las aurículas sigan activas.",
    caveat:
      "El control continuo resume varios grados de bloqueo; no sustituye su clasificación electrocardiográfica real.",
    rhythmLabel: "Conducción intermitente",
    qrsLabel: "QRS omitidos",
    stLabel: "Sin patrón específico",
    mechanicalLoss: 0.34,
    progressionRate: 0.12,
    timeUnit: "min",
    specific: {
      label: "Impulsos no conducidos",
      min: 10,
      max: 80,
      step: 1,
      defaultValue: 36,
      unit: "%",
    },
  },
  {
    id: "ischemia",
    code: "ISQ",
    name: "Isquemia miocárdica",
    family: "Coronaria",
    color: "#ffb547",
    region: "anterior-lv",
    regionLabel: "pared anterior del ventrículo izquierdo",
    pattern: "ischemia",
    summary:
      "Una zona recibe menos oxígeno, pero el tejido todavía puede recuperarse.",
    heartLesson:
      "La zona ámbar pierde movimiento progresivamente cuando la demanda supera al aporte de oxígeno.",
    ecgLesson:
      "En este preset, busca descenso del ST e inversión de T en una tira simplificada.",
    causalLesson:
      "Frecuencia, fiebre y presión elevadas aumentan la demanda; una SpO₂ baja reduce el aporte sistémico de oxígeno.",
    caveat:
      "La isquemia puede no producir este patrón y una SpO₂ normal no la descarta.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Estrecho",
    stLabel: "ST descendido / T invertida",
    mechanicalLoss: 0.3,
    progressionRate: 0.38,
    timeUnit: "min",
    specific: {
      label: "Reducción de flujo coronario",
      min: 10,
      max: 90,
      step: 1,
      defaultValue: 48,
      unit: "%",
    },
  },
  {
    id: "infarction",
    code: "IAM",
    name: "Infarto agudo · STEMI",
    family: "Coronaria",
    color: "#ff4f66",
    region: "anterior-lv",
    regionLabel: "territorio anterior y apical del VI",
    pattern: "infarction",
    summary:
      "Una arteria se ocluye y parte del músculo empieza a lesionarse por falta de flujo.",
    heartLesson:
      "Sigue el gradiente desde hipoperfusión hasta una pared con contracción muy reducida.",
    ecgLesson:
      "En este preset educativo aparece elevación regional del ST y una onda Q progresiva.",
    causalLesson:
      "El daño aumenta con el tiempo de oclusión; colesterol y presión actúan como factores crónicos, no como interruptores instantáneos.",
    caveat:
      "No todo infarto eleva el ST. El diagnóstico integra clínica, ECG seriado y biomarcadores como troponina.",
    rhythmLabel: "Sinusal, posible ectopia",
    qrsLabel: "Q progresiva",
    stLabel: "ST elevado regional",
    mechanicalLoss: 0.7,
    progressionRate: 0.7,
    timeUnit: "min",
    specific: {
      label: "Oclusión coronaria",
      min: 30,
      max: 100,
      step: 1,
      defaultValue: 72,
      unit: "%",
    },
  },
  {
    id: "heart-failure",
    code: "IC",
    name: "Insuficiencia cardíaca",
    family: "Bombeo",
    color: "#55a8ff",
    region: "left-ventricle",
    regionLabel: "ventrículo izquierdo",
    pattern: "heart-failure",
    summary:
      "El ventrículo izquierdo expulsa menos sangre en cada latido.",
    heartLesson:
      "Observa la dilatación, la contracción global débil y el mayor volumen residual.",
    ecgLesson:
      "No existe un ECG único de insuficiencia cardíaca: aquí se muestra un ejemplo inespecífico con QRS algo ensanchado.",
    causalLesson:
      "Más poscarga reduce el volumen sistólico; frecuencias extremas también empeoran el gasto.",
    caveat:
      "La fracción de eyección se estima con imagen cardíaca, no a partir de esta tira ECG.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Levemente ancho",
    stLabel: "Cambios inespecíficos",
    mechanicalLoss: 0.82,
    progressionRate: 0.24,
    timeUnit: "meses",
    specific: {
      label: "Fracción de eyección",
      min: 15,
      max: 45,
      step: 1,
      defaultValue: 34,
      unit: "%",
      inverse: true,
    },
  },
  {
    id: "aortic-stenosis",
    code: "EA",
    name: "Estenosis aórtica",
    family: "Válvula",
    color: "#ff9f43",
    region: "aortic-valve",
    regionLabel: "válvula aórtica y VI",
    pattern: "aortic-stenosis",
    summary:
      "La válvula se abre menos y el ventrículo trabaja contra una resistencia mayor.",
    heartLesson:
      "Mira el orificio reducido, el chorro estrecho y el engrosamiento progresivo del ventrículo izquierdo.",
    ecgLesson:
      "Puede sugerir hipertrofia ventricular izquierda, pero la ecografía es la prueba anatómica clave.",
    causalLesson:
      "La obstrucción aumenta la poscarga y, con tiempo, favorece hipertrofia y rigidez ventricular.",
    caveat:
      "El trazado mostrado es una posibilidad avanzada, no un patrón diagnóstico único.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Alto voltaje",
    stLabel: "Patrón de sobrecarga",
    mechanicalLoss: 0.42,
    progressionRate: 0.18,
    timeUnit: "años",
    specific: {
      label: "Área valvular conceptual",
      min: 0.5,
      max: 3.5,
      step: 0.1,
      defaultValue: 1.3,
      unit: "cm²",
      inverse: true,
    },
  },
  {
    id: "mitral-regurgitation",
    code: "IM",
    name: "Insuficiencia mitral",
    family: "Válvula",
    color: "#4cc9f0",
    region: "mitral-valve",
    regionLabel: "válvula mitral y aurícula izquierda",
    pattern: "mitral-regurgitation",
    summary:
      "La válvula no cierra bien y parte de la sangre vuelve a la aurícula izquierda.",
    heartLesson:
      "Durante la sístole aparece un chorro retrógrado y disminuye el flujo útil hacia la aorta.",
    ecgLesson:
      "No hay un patrón único; este ejemplo muestra una P ensanchada como pista de remodelado auricular crónico.",
    causalLesson:
      "Una poscarga elevada puede aumentar el flujo regurgitante en este modelo simplificado.",
    caveat:
      "La gravedad real se cuantifica principalmente con ecocardiografía, no con ECG.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Estrecho",
    stLabel: "Sin patrón específico",
    mechanicalLoss: 0.46,
    progressionRate: 0.2,
    timeUnit: "meses",
    specific: {
      label: "Fracción regurgitante",
      min: 10,
      max: 70,
      step: 1,
      defaultValue: 38,
      unit: "%",
    },
  },
  {
    id: "pericarditis",
    code: "PER",
    name: "Pericarditis aguda",
    family: "Inflamación",
    color: "#f47ebb",
    region: "pericardium",
    regionLabel: "pericardio",
    pattern: "pericarditis",
    summary:
      "El saco que rodea al corazón se inflama; puede existir o no derrame.",
    heartLesson:
      "La capa rosa marca el pericardio inflamado. El miocardio conserva su movimiento en el caso simple.",
    ecgLesson:
      "Busca elevación difusa y cóncava del ST con descenso del PR, sin seguir una sola arteria.",
    causalLesson:
      "La fiebre acompaña algunos cuadros y eleva la frecuencia, pero no determina por sí sola la gravedad.",
    caveat:
      "El patrón ECG típico no aparece en todos los casos. Pericarditis, derrame y taponamiento no son equivalentes.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Estrecho",
    stLabel: "ST difuso + PR descendido",
    mechanicalLoss: 0.1,
    progressionRate: 0.22,
    timeUnit: "días",
    specific: {
      label: "Inflamación pericárdica",
      min: 10,
      max: 100,
      step: 1,
      defaultValue: 52,
      unit: "%",
    },
  },
  {
    id: "hcm",
    code: "MCH",
    name: "Miocardiopatía hipertrófica",
    family: "Músculo",
    color: "#d895ff",
    region: "septum",
    regionLabel: "septo y tracto de salida del VI",
    pattern: "hcm",
    summary:
      "El músculo, sobre todo el septo, se engrosa y puede dificultar la salida de sangre.",
    heartLesson:
      "Observa el septo aumentado, la cavidad menor y el tracto de salida más estrecho.",
    ecgLesson:
      "Puede haber voltajes altos, ondas Q estrechas y cambios de repolarización.",
    causalLesson:
      "La obstrucción dinámica y el llenado diastólico importan tanto como la fuerza de contracción.",
    caveat:
      "El ECG aporta pistas, pero no define por sí solo el grosor ni la obstrucción anatómica.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Alto voltaje / Q estrecha",
    stLabel: "T invertida posible",
    mechanicalLoss: 0.32,
    progressionRate: 0.12,
    timeUnit: "años",
    specific: {
      label: "Grosor septal conceptual",
      min: 12,
      max: 35,
      step: 1,
      defaultValue: 21,
      unit: "mm",
    },
  },
];

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getDisease(id: DiseaseId) {
  return DISEASES.find((disease) => disease.id === id) ?? DISEASES[0];
}

export function normaliseSpecific(disease: Disease, value: number) {
  const fraction =
    (clamp(value, disease.specific.min, disease.specific.max) -
      disease.specific.min) /
    (disease.specific.max - disease.specific.min);
  return disease.specific.inverse ? 1 - fraction : fraction;
}

export function formatSpecific(disease: Disease, value: number) {
  const decimals = disease.specific.step < 1 ? 1 : 0;
  return `${value.toFixed(decimals)} ${disease.specific.unit}`;
}

export function deriveSimulation(
  vitals: Vitals,
  disease: Disease,
  baseSeverity: number,
  specificValue: number,
  clinicalTime: number,
): DerivedSimulation {
  const specificLoad = normaliseSpecific(disease, specificValue);
  const pressureLoad = clamp((vitals.systolic - 120) / 80, 0, 1);
  const pressureLow = clamp((95 - vitals.systolic) / 25, 0, 1);
  const ldlLoad = clamp((vitals.ldl - 100) / 140, 0, 1);
  const feverLoad = clamp((vitals.temperature - 37) / 3.5, 0, 1);
  const hypoxiaLoad = clamp((95 - vitals.spo2) / 15, 0, 1);
  const viscosityLoad = clamp((vitals.viscosity - 1) / 0.7, 0, 1);

  const coronaryWeight =
    disease.id === "ischemia" || disease.id === "infarction" ? 1 : 0.28;
  const chronicWeight =
    disease.timeUnit === "años" || disease.timeUnit === "meses" ? 1 : 0.4;
  const riskIndex = clamp(
    pressureLoad * 0.24 +
      pressureLow * 0.08 +
      ldlLoad * 0.25 * coronaryWeight * chronicWeight +
      feverLoad * 0.16 +
      hypoxiaLoad * 0.18 +
      viscosityLoad * 0.09,
    0,
    1,
  );
  const riskMultiplier = 0.75 + riskIndex * 1.85;

  const startingSeverity =
    disease.id === "afib"
      ? baseSeverity
      : baseSeverity * (0.76 + specificLoad * 0.24);
  const progression = clinicalTime * disease.progressionRate * riskMultiplier;
  const severity = clamp(startingSeverity + progression, 0, 100);
  const severity01 = severity / 100;

  const feverRate = Math.max(0, vitals.temperature - 37) * 7;
  const hypoxiaRate = Math.max(0, 94 - vitals.spo2) * 0.9;
  let heartRate = vitals.heartRate + feverRate + hypoxiaRate;

  if (disease.id === "afib") {
    heartRate = vitals.heartRate + feverRate + hypoxiaRate;
  } else if (disease.id === "vt") {
    heartRate = specificValue;
  } else if (disease.id === "av-block") {
    heartRate = Math.max(28, heartRate * (1 - 0.58 * severity01));
  }
  heartRate = clamp(Math.round(heartRate), 28, 220);

  let contractility = clamp(1 - disease.mechanicalLoss * severity01, 0.18, 1);
  if (disease.id === "afib") {
    // AF primarily removes atrial contribution and varies preload beat to beat;
    // it does not inherently weaken ventricular myocardial contractility.
    contractility = 1;
  }
  if (disease.id === "hcm") {
    contractility = clamp(1.04 - 0.08 * severity01, 0.78, 1.08);
  }
  if (disease.id === "pericarditis") {
    contractility = clamp(1 - 0.08 * severity01, 0.82, 1);
  }

  const afterloadPenalty = clamp(
    1 - pressureLoad * 0.18 - viscosityLoad * 0.08,
    0.68,
    1.04,
  );
  const fillingPenalty =
    heartRate > 130 ? clamp(1 - (heartRate - 130) / 210, 0.5, 1) : 1;
  const rhythmPenalty =
    disease.id === "afib"
      ? 0.95 - severity01 * 0.1
      : disease.id === "vt"
        ? 1 - severity01 * 0.32
        : disease.id === "av-block"
          ? 1 - severity01 * 0.08
          : 1;
  const valvePenalty =
    disease.id === "aortic-stenosis"
      ? 1 - severity01 * 0.28
      : disease.id === "mitral-regurgitation"
        ? 1 - severity01 * 0.34
        : disease.id === "hcm"
          ? 1 - severity01 * 0.2
          : 1;

  const strokeVolume = clamp(
    74 *
      contractility *
      afterloadPenalty *
      fillingPenalty *
      rhythmPenalty *
      valvePenalty,
    18,
    105,
  );
  const cardiacOutput = clamp((strokeVolume * heartRate) / 1000, 1.2, 11);

  let ejectionFraction = clamp(
    64 - disease.mechanicalLoss * severity * 0.72 - pressureLoad * 3,
    16,
    76,
  );
  if (disease.id === "afib") {
    ejectionFraction = clamp(64 - pressureLoad * 3, 56, 68);
  }
  if (disease.id === "heart-failure") {
    ejectionFraction = clamp(
      specificValue - progression * 0.18,
      disease.specific.min,
      disease.specific.max,
    );
  } else if (disease.id === "hcm") {
    ejectionFraction = clamp(67 + severity01 * 6, 62, 78);
  } else if (disease.id === "aortic-stenosis") {
    ejectionFraction = clamp(65 - severity01 * 10, 38, 68);
  }

  const outputLoss = clamp((5.2 - cardiacOutput) / 4, 0, 0.36);
  const rhythmPressureLoss =
    disease.id === "vt" ? severity01 * 0.24 : disease.id === "av-block" ? severity01 * 0.14 : 0;
  const currentSystolic = clamp(
    Math.round(vitals.systolic * (1 - outputLoss - rhythmPressureLoss)),
    62,
    218,
  );
  const currentDiastolic = clamp(
    Math.round(vitals.diastolic * (1 - outputLoss * 0.58 - rhythmPressureLoss * 0.35)),
    38,
    138,
  );
  const map = Math.round(currentDiastolic + (currentSystolic - currentDiastolic) / 3);

  const activeRisks: string[] = [];
  if (pressureLoad > 0.22) activeRisks.push("poscarga alta");
  if (pressureLow > 0.25) activeRisks.push("presión de perfusión baja");
  if (ldlLoad > 0.3) activeRisks.push("LDL crónico");
  if (feverLoad > 0.18) activeRisks.push("fiebre / demanda");
  if (hypoxiaLoad > 0.16) activeRisks.push("aporte de O₂ bajo");
  if (viscosityLoad > 0.28) activeRisks.push("resistencia conceptual");

  let stability: DerivedSimulation["stability"] = "Compensado";
  let stabilityTone: DerivedSimulation["stabilityTone"] = "stable";
  if (currentSystolic < 90 || cardiacOutput < 2.6 || (disease.id === "vt" && severity > 62)) {
    stability = "Inestable";
    stabilityTone = "danger";
  } else if (currentSystolic < 102 || cardiacOutput < 3.8 || severity > 72) {
    stability = "Vigilancia";
    stabilityTone = "watch";
  }

  return {
    severity,
    heartRate,
    map,
    currentSystolic,
    currentDiastolic,
    strokeVolume,
    cardiacOutput,
    ejectionFraction,
    contractility,
    rhythmIrregularity:
      disease.id === "afib" ? clamp(specificValue / 100, 0.35, 0.9) : 0,
    riskIndex,
    riskMultiplier,
    stability,
    stabilityTone,
    activeRisks,
  };
}
