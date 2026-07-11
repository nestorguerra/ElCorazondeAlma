import {
  deriveAorticStenosisProgression,
  EMPTY_AORTIC_STENOSIS_PROGRESSION,
  type AorticStenosisProgression,
} from "./aorticStenosisModel.ts";
import {
  deriveHeartFailureProgression,
  EMPTY_HEART_FAILURE_PROGRESSION,
  type HeartFailureProgression,
} from "./heartFailureModel.ts";
import {
  deriveInfarctionProgression,
  EMPTY_INFARCTION_PROGRESSION,
  type InfarctionProgression,
} from "./infarctionModel.ts";
import {
  deriveMitralRegurgitationProgression,
  EMPTY_MITRAL_REGURGITATION_PROGRESSION,
  type MitralRegurgitationProgression,
} from "./mitralRegurgitationModel.ts";

type AvBlockStage = 1 | 2 | 3 | 4;

const AV_BLOCK_LABELS: Record<AvBlockStage, string> = {
  1: "1.º grado",
  2: "Mobitz I · Wenckebach",
  3: "Mobitz II",
  4: "Bloqueo AV completo",
};

const toAvBlockStage = (value: number) =>
  Math.min(4, Math.max(1, Math.round(value))) as AvBlockStage;

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
  coronaryFlowFraction: number;
  supplyDemandImbalance: number;
  infarction: InfarctionProgression;
  heartFailure: HeartFailureProgression;
  aorticStenosis: AorticStenosisProgression;
  mitralRegurgitation: MitralRegurgitationProgression;
  heartRate: number;
  atrialRate: number;
  avBlockStage: AvBlockStage;
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
    name: "Taquicardia ventricular monomórfica",
    family: "Ritmo",
    color: "#ff665f",
    region: "ventricles",
    regionLabel: "foco en VD · activación de ambos ventrículos",
    pattern: "vt",
    summary:
      "Un foco o circuito ventricular genera una taquicardia sostenida con la misma morfología QRS en cada latido.",
    heartLesson:
      "Observa cómo la activación nace en un ventrículo y alcanza tarde otras paredes: la contracción es rápida, regionalmente desfasada y deja poco tiempo de llenado.",
    ecgLesson:
      "Busca una taquicardia regular con QRS anchos e idénticos, ST–T discordante y pequeñas ondas P que mantienen un ritmo independiente.",
    causalLesson:
      "La activación se propaga lentamente de célula a célula fuera del sistema His–Purkinje. El QRS se ensancha, las paredes se contraen en momentos distintos y la frecuencia alta acorta la diástole.",
    caveat:
      "Representa una TV monomórfica sostenida con patrón tipo BRI. No toda taquicardia de QRS ancho es ventricular y la estabilidad no puede inferirse solo por la frecuencia.",
    rhythmLabel: "Regular · disociación AV",
    qrsLabel: "Monomórfico · ≈160 ms",
    stLabel: "Discordancia secundaria",
    mechanicalLoss: 0.32,
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
      "La conducción entre aurículas y ventrículos se retrasa o se interrumpe con un patrón definido por el grado de bloqueo.",
    heartLesson:
      "Sigue el impulso desde las aurículas: puede retrasarse, detenerse en el nodo AV o coexistir con un escape ventricular independiente.",
    ecgLesson:
      "Compara cada onda P con su QRS: PR largo en primer grado, PR progresivo en Mobitz I, PR constante con fallos en Mobitz II y disociación en bloqueo completo.",
    causalLesson:
      "Las aurículas conservan su ritmo. Cuando falla la conducción, disminuyen los latidos ventriculares; en el bloqueo completo, un foco de escape lento mantiene la contracción ventricular.",
    caveat:
      "Los cuatro estados son patrones didácticos separados. Mobitz II y el bloqueo completo requieren valoración urgente y suelen indicar estimulación permanente si no hay causa reversible.",
    rhythmLabel: "Patrón AV según grado",
    qrsLabel: "Dependiente del nivel",
    stLabel: "Sin patrón específico",
    mechanicalLoss: 0,
    progressionRate: 0.12,
    timeUnit: "min",
    specific: {
      label: "Tipo de bloqueo AV",
      min: 1,
      max: 4,
      step: 1,
      defaultValue: 3,
      unit: "",
    },
  },
  {
    id: "ischemia",
    code: "ISQ",
    name: "Isquemia miocárdica",
    family: "Coronaria",
    color: "#ffb547",
    region: "anterior-lv",
    regionLabel: "pared anterolateral y apical del ventrículo izquierdo",
    pattern: "ischemia",
    summary:
      "Isquemia subendocárdica anterolateral reversible: el aporte coronario no cubre la demanda, sin asumir necrosis.",
    heartLesson:
      "La zona ámbar primero se contrae tarde y después se vuelve hipocinética. No se representa acinesia ni abombamiento paradójico: eso se reserva para lesión más avanzada.",
    ecgLesson:
      "Ritmo sinusal y QRS estrecho. Al aumentar la carga aparece descenso horizontal-descendente del ST y T simétrica negativa, más marcado en V5 que en V2 y DII.",
    causalLesson:
      "El modelo combina reducción de flujo con demanda miocárdica aproximada por frecuencia × presión sistólica. Fiebre y una SpO₂ baja agravan el desequilibrio.",
    caveat:
      "Este es un escenario docente concreto, no una firma diagnóstica universal: la isquemia puede mostrar otros cambios o incluso un ECG normal. Una SpO₂ normal no la descarta.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Estrecho",
    stLabel: "ST ↓ horizontal · T simétrica negativa",
    mechanicalLoss: 0.12,
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
    name: "Infarto anterior agudo · STEMI",
    family: "Coronaria",
    color: "#ff4f66",
    region: "anterior-lv",
    regionLabel: "territorio anterior y apical del VI",
    pattern: "infarction",
    summary:
      "Oclusión aguda de la descendente anterior con lesión transmural progresiva del territorio anterior y apical.",
    heartLesson:
      "La alteración mecánica aparece pronto: el borde se vuelve hipocinético y el núcleo anterior-apical progresa hacia akinesia. Sólo el daño transmural muy avanzado produce una discreta disquinesia aguda.",
    ecgLesson:
      "La secuencia sin reperfusión comienza con T hiperagudas, evoluciona a elevación del ST en V2 y V5 con descenso recíproco en DII, y después pierde R y desarrolla Q patológica.",
    causalLesson:
      "La oclusión y el tiempo determinan el daño agudo. La extensión del territorio en riesgo modula la magnitud eléctrica y el impacto sobre la función ventricular.",
    caveat:
      "Este preset representa un STEMI anterior por DA persistentemente ocluida y sin reperfusión simulada. No todo infarto eleva el ST; el diagnóstico real exige clínica, ECG seriado, troponina, imagen y angiografía.",
    rhythmLabel: "Sinusal, posible ectopia",
    qrsLabel: "Pérdida de R · Q evolutiva",
    stLabel: "ST ↑ V2/V5 · descenso recíproco DII",
    mechanicalLoss: 0.28,
    progressionRate: 0.7,
    timeUnit: "min",
    specific: {
      label: "Oclusión aguda de la DA",
      min: 90,
      max: 100,
      step: 1,
      defaultValue: 100,
      unit: "%",
    },
  },
  {
    id: "heart-failure",
    code: "IC",
    name: "Insuficiencia cardíaca · FE reducida",
    family: "Bombeo",
    color: "#55a8ff",
    region: "left-ventricle",
    regionLabel: "ventrículo izquierdo dilatado",
    pattern: "heart-failure",
    summary:
      "Fenotipo dilatado con fracción de eyección reducida: aumenta el volumen ventricular y queda más sangre residual tras cada sístole.",
    heartLesson:
      "Observa una contracción global coordinada pero débil: disminuyen el acortamiento y el engrosamiento sistólico mientras aumentan los volúmenes telediastólico y telesistólico.",
    ecgLesson:
      "Este fenotipo mantiene ritmo sinusal y QRS estrecho, con pobre progresión de R en V2 y cambios laterales inespecíficos. La FE no se puede deducir del ECG.",
    causalLesson:
      "La FE relaciona el volumen expulsado con el volumen telediastólico. Un VI dilatado puede conservar cierto volumen sistólico, pero deja un volumen residual alto y pierde reserva de gasto.",
    caveat:
      "No existe un ECG diagnóstico de insuficiencia cardíaca. Este preset no incluye fibrilación auricular ni bloqueo de rama; la confirmación exige síntomas o signos, biomarcadores e imagen cardíaca.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Estrecho · sin BRI",
    stLabel: "Repolarización inespecífica",
    mechanicalLoss: 0,
    progressionRate: 0,
    timeUnit: "meses",
    specific: {
      label: "Fracción de eyección del VI",
      min: 15,
      max: 40,
      step: 1,
      defaultValue: 35,
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
      "La válvula aórtica calcificada abre menos, acelera el chorro sistólico y eleva la presión del ventrículo izquierdo.",
    heartLesson:
      "Mira la apertura sistólica limitada, el chorro rápido y turbulento, la eyección prolongada y la hipertrofia concéntrica del VI.",
    ecgLesson:
      "Busca voltajes de hipertrofia y, si el remodelado es avanzado, descenso del ST e inversión asimétrica de T en V5. Pueden faltar y no gradúan la válvula.",
    causalLesson:
      "La obstrucción aumenta la poscarga valvular; el VI compensa engrosando su pared y suele conservar la FE hasta fases tardías.",
    caveat:
      "Fenotipo calcificado de flujo normal, ritmo sinusal y FE conservada. La gravedad real exige integrar Doppler, área, flujo, presión, anatomía y síntomas.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Voltaje de VI variable",
    stLabel: "Sobrecarga lateral si hay HVI",
    mechanicalLoss: 0.08,
    progressionRate: 0,
    timeUnit: "años",
    specific: {
      label: "Área valvular efectiva actual",
      min: 0.7,
      max: 1.8,
      step: 0.1,
      defaultValue: 1.2,
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
      "Una lesión degenerativa impide la coaptación mitral y desvía parte del volumen sistólico hacia la aurícula izquierda.",
    heartLesson:
      "Durante la sístole compara el volumen total del VI, el chorro retrógrado hacia la AI y el volumen útil que cruza la aorta.",
    ecgLesson:
      "El ECG puede seguir siendo normal. Con remodelado crónico pueden aparecer P ancha y mellada en DII, componente terminal negativo en V2 o voltaje de VI.",
    causalLesson:
      "La sobrecarga de volumen dilata progresivamente AI y VI; la FE total puede parecer normal o alta aunque el gasto anterógrado disminuya.",
    caveat:
      "Fenotipo primario degenerativo crónico, compensado y en ritmo sinusal. No representa IM secundaria, rotura papilar aguda ni fibrilación auricular.",
    rhythmLabel: "Sinusal",
    qrsLabel: "Estrecho · voltaje variable",
    stLabel: "Sin patrón ST–T específico",
    mechanicalLoss: 0.04,
    progressionRate: 0,
    timeUnit: "años",
    specific: {
      label: "Fracción regurgitante actual",
      min: 10,
      max: 60,
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
  if (disease.id === "av-block") {
    return AV_BLOCK_LABELS[toAvBlockStage(value)];
  }
  const decimals = disease.specific.step < 1 ? 1 : 0;
  return `${value.toFixed(decimals)} ${disease.specific.unit}`.trim();
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
  const coronaryFlowFraction =
    disease.id === "ischemia" || disease.id === "infarction"
      ? clamp(1 - specificValue / 100, 0, 1)
      : 1;
  const infarction =
    disease.id === "infarction"
      ? deriveInfarctionProgression(specificValue, clinicalTime, baseSeverity)
      : EMPTY_INFARCTION_PROGRESSION;
  const heartFailure =
    disease.id === "heart-failure"
      ? deriveHeartFailureProgression(
          specificValue,
          baseSeverity,
          clinicalTime,
          clamp(pressureLoad * 0.75 + viscosityLoad * 0.25, 0, 1),
          vitals.heartRate + Math.max(0, vitals.temperature - 37) * 7,
        )
      : EMPTY_HEART_FAILURE_PROGRESSION;
  const aorticStenosis =
    disease.id === "aortic-stenosis"
      ? deriveAorticStenosisProgression(
          specificValue,
          baseSeverity,
          clinicalTime,
          vitals.heartRate + Math.max(0, vitals.temperature - 37) * 7,
          vitals.systolic,
        )
      : EMPTY_AORTIC_STENOSIS_PROGRESSION;
  const mitralRegurgitation =
    disease.id === "mitral-regurgitation"
      ? deriveMitralRegurgitationProgression(
          specificValue,
          baseSeverity,
          clinicalTime,
          vitals.heartRate + Math.max(0, vitals.temperature - 37) * 7,
          vitals.systolic,
        )
      : EMPTY_MITRAL_REGURGITATION_PROGRESSION;
  const demandHeartRate =
    vitals.heartRate + Math.max(0, vitals.temperature - 37) * 7;
  const ratePressureProduct = demandHeartRate * vitals.systolic;
  const demandLoad = clamp((ratePressureProduct - 7000) / 15000, 0, 1);
  const coronaryPressurePenalty = clamp((65 - vitals.diastolic) / 25, 0, 1);
  const supplyDemandImbalance =
    disease.id === "ischemia"
      ? clamp(
          (1 - coronaryFlowFraction) * 0.68 +
            demandLoad * 0.22 +
            hypoxiaLoad * 0.06 +
            coronaryPressurePenalty * 0.04,
          0,
          1,
        )
      : 0;

  const coronaryWeight =
    disease.id === "ischemia" || disease.id === "infarction" ? 1 : 0.28;
  const chronicWeight =
    disease.timeUnit === "años" || disease.timeUnit === "meses" ? 1 : 0.4;
  const genericRiskIndex = clamp(
    pressureLoad * 0.24 +
      pressureLow * 0.08 +
      ldlLoad * 0.25 * coronaryWeight * chronicWeight +
      feverLoad * 0.16 +
      hypoxiaLoad * 0.18 +
      viscosityLoad * 0.09,
    0,
    1,
  );
  const riskIndex =
    disease.id === "ischemia"
      ? supplyDemandImbalance
      : disease.id === "infarction"
        ? clamp(
            infarction.occlusiveLoad * 0.7 +
              infarction.necrosisFraction * 0.3,
            0,
            1,
          )
        : disease.id === "heart-failure"
          ? clamp(
              heartFailure.globalSystolicLoss * 0.62 +
                heartFailure.dilationFraction * 0.38,
              0,
              1,
            )
          : disease.id === "aortic-stenosis"
            ? clamp(
                aorticStenosis.obstructionFraction * 0.56 +
                  aorticStenosis.concentricHypertrophy * 0.44,
                0,
                1,
              )
            : disease.id === "mitral-regurgitation"
              ? clamp(
                  mitralRegurgitation.regurgitantFraction * 0.62 +
                    mitralRegurgitation.leftAtrialDilation * 0.2 +
                    mitralRegurgitation.leftVentricularDilation * 0.18,
                  0,
                  1,
                )
        : genericRiskIndex;
  const riskMultiplier = 0.75 + riskIndex * 1.85;

  const startingSeverity =
    disease.id === "afib"
      ? baseSeverity
      : disease.id === "vt"
        ? clamp(baseSeverity + (specificLoad - 0.45) * 18, 0, 100)
        : disease.id === "ischemia"
          ? clamp(baseSeverity * 0.22 + supplyDemandImbalance * 72, 0, 100)
          : disease.id === "infarction"
            ? clamp(
                infarction.wallMotionLoss * 72 +
                  infarction.necrosisFraction * 20 +
                  baseSeverity * 0.08,
                0,
                100,
              )
            : disease.id === "heart-failure"
              ? clamp(
                  heartFailure.globalSystolicLoss * 65 +
                    heartFailure.dilationFraction * 35,
                  0,
                  100,
                )
              : disease.id === "aortic-stenosis"
                ? clamp(
                    Math.max(
                      aorticStenosis.obstructionFraction * 100,
                      ((aorticStenosis.peakVelocity - 2.5) / 2.5) * 100,
                      (aorticStenosis.meanGradient / 60) * 100,
                    ),
                    0,
                    100,
                  )
                : disease.id === "mitral-regurgitation"
                  ? clamp(
                      (mitralRegurgitation.regurgitantFraction / 0.6) * 78 +
                        mitralRegurgitation.leftAtrialDilation * 12 +
                        mitralRegurgitation.leftVentricularDilation * 10,
                      0,
                      100,
                    )
          : baseSeverity * (0.76 + specificLoad * 0.24);
  const progression =
    disease.id === "infarction" ||
    disease.id === "heart-failure" ||
    disease.id === "aortic-stenosis" ||
    disease.id === "mitral-regurgitation"
      ? 0
      : clinicalTime * disease.progressionRate * riskMultiplier;
  const severity = clamp(startingSeverity + progression, 0, 100);
  const severity01 = severity / 100;
  const avBlockStage = toAvBlockStage(
    disease.id === "av-block" ? specificValue : 1,
  );

  const feverRate = Math.max(0, vitals.temperature - 37) * 7;
  const hypoxiaRate = Math.max(0, 94 - vitals.spo2) * 0.9;
  let heartRate = vitals.heartRate + feverRate + hypoxiaRate;
  const atrialRate = clamp(
    Math.round(vitals.heartRate + feverRate),
    40,
    130,
  );

  if (disease.id === "afib") {
    heartRate = vitals.heartRate + feverRate + hypoxiaRate;
  } else if (disease.id === "vt") {
    heartRate = specificValue;
  } else if (disease.id === "av-block") {
    heartRate =
      avBlockStage === 1
        ? atrialRate
        : avBlockStage === 2
          ? atrialRate * 0.75
          : avBlockStage === 3
            ? atrialRate * (2 / 3)
            : clamp(46 - severity01 * 15, 28, 45);
  }
  heartRate = clamp(Math.round(heartRate), 28, 220);

  let contractility = clamp(1 - disease.mechanicalLoss * severity01, 0.18, 1);
  if (disease.id === "afib") {
    // AF primarily removes atrial contribution and varies preload beat to beat;
    // it does not inherently weaken ventricular myocardial contractility.
    contractility = 1;
  }
  if (disease.id === "vt") {
    // The myocardium may retain intrinsic force; acute pump loss comes mainly
    // from rapid filling, abnormal activation and mechanical dyssynchrony.
    contractility = clamp(1 - severity01 * 0.18, 0.72, 1);
  }
  if (disease.id === "av-block") {
    contractility = avBlockStage === 4 ? 0.88 : 1;
  }
  if (disease.id === "ischemia") {
    // The defect is regional. Avoid translating it into a large global loss of
    // intrinsic myocardial force while the tissue remains viable.
    contractility = clamp(1 - severity01 * 0.08, 0.9, 1);
  }
  if (disease.id === "infarction") {
    // Large anterior infarction is regional first; global intrinsic force does
    // not collapse uniformly across the entire ventricular myocardium.
    contractility = clamp(
      1 -
        infarction.wallMotionLoss * 0.16 -
        infarction.necrosisFraction * 0.08,
      0.74,
      1,
    );
  }
  if (disease.id === "heart-failure") {
    contractility = heartFailure.contractility;
  }
  if (disease.id === "aortic-stenosis") {
    // Radial shortening and LVEF are commonly preserved while longitudinal
    // mechanics deteriorate under chronic pressure overload.
    contractility = aorticStenosis.contractility;
  }
  if (disease.id === "mitral-regurgitation") {
    // Compensated primary MR can look hyperdynamic because LVEF includes the
    // low-impedance regurgitant volume, not only useful aortic output.
    contractility = mitralRegurgitation.contractility;
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
    disease.id === "vt"
      ? clamp(1 - Math.max(0, heartRate - 110) / 180, 0.35, 1)
      : heartRate > 130
        ? clamp(1 - (heartRate - 130) / 210, 0.5, 1)
        : 1;
  const rhythmPenalty =
    disease.id === "afib"
      ? 0.95 - severity01 * 0.1
      : disease.id === "vt"
        ? 1 - severity01 * 0.22
        : disease.id === "av-block"
          ? avBlockStage === 4
            ? 0.92
            : 0.98
          : 1;
  const valvePenalty =
    disease.id === "hcm" ? 1 - severity01 * 0.2 : 1;
  const regionalPumpPenalty =
    disease.id === "infarction"
      ? clamp(
          1 -
            infarction.wallMotionLoss * infarction.territoryFraction * 0.25 -
            infarction.regionalDyskinesia * 0.16,
          0.68,
          1,
        )
      : 1;

  const strokeVolume =
    disease.id === "heart-failure"
      ? clamp(heartFailure.strokeVolume, 18, 105)
      : disease.id === "aortic-stenosis"
        ? clamp(aorticStenosis.strokeVolume, 18, 105)
        : disease.id === "mitral-regurgitation"
          ? clamp(mitralRegurgitation.forwardStrokeVolume, 18, 105)
      : clamp(
          74 *
            contractility *
            afterloadPenalty *
            fillingPenalty *
            rhythmPenalty *
            valvePenalty *
            regionalPumpPenalty,
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
  if (disease.id === "vt") {
    ejectionFraction = clamp(
      61 - severity01 * 18 - Math.max(0, heartRate - 140) * 0.07,
      26,
      62,
    );
  }
  if (disease.id === "av-block") {
    ejectionFraction = clamp(
      64 - (avBlockStage === 4 ? 5 : 0) - pressureLoad * 3,
      50,
      68,
    );
  }
  if (disease.id === "ischemia") {
    ejectionFraction = clamp(64 - severity01 * 8 - pressureLoad * 3, 52, 66);
  }
  if (disease.id === "infarction") {
    ejectionFraction = clamp(
      64 -
        infarction.wallMotionLoss * infarction.territoryFraction * 24 -
        infarction.necrosisFraction * 8 -
        pressureLoad * 3,
      30,
      65,
    );
  }
  if (disease.id === "heart-failure") {
    ejectionFraction = heartFailure.ejectionFraction;
  } else if (disease.id === "aortic-stenosis") {
    ejectionFraction = aorticStenosis.ejectionFraction;
  } else if (disease.id === "mitral-regurgitation") {
    ejectionFraction = mitralRegurgitation.ejectionFraction;
  } else if (disease.id === "hcm") {
    ejectionFraction = clamp(67 + severity01 * 6, 62, 78);
  }

  const outputLoss =
    disease.id === "av-block"
      ? clamp((4.2 - cardiacOutput) / 8, 0, 0.18)
      : clamp((5.2 - cardiacOutput) / 4, 0, 0.36);
  const rhythmPressureLoss =
    disease.id === "vt"
      ? severity01 * 0.24
      : disease.id === "av-block"
        ? avBlockStage === 4
          ? 0.18 + severity01 * 0.08
          : avBlockStage === 3
            ? 0.08
            : 0.03
        : 0;
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
  if (disease.id === "heart-failure") {
    activeRisks.push("FE reducida");
    if (heartFailure.dilationFraction > 0.58) activeRisks.push("VI dilatado");
  }
  if (disease.id === "aortic-stenosis") {
    activeRisks.push(
      aorticStenosis.flowState === "normal" ? "flujo normal" : "flujo bajo",
    );
    if (aorticStenosis.meanGradient >= 40) {
      activeRisks.push("gradiente transvalvular alto");
    }
    if (aorticStenosis.concentricHypertrophy > 0.46) {
      activeRisks.push("hipertrofia concéntrica");
    }
  }
  if (disease.id === "mitral-regurgitation") {
    activeRisks.push(
      `volumen regurgitante ${Math.round(mitralRegurgitation.regurgitantVolume)} mL`,
    );
    if (mitralRegurgitation.leftAtrialDilation > 0.46) {
      activeRisks.push("aurícula izquierda dilatada");
    }
    if (mitralRegurgitation.leftVentricularDilation > 0.42) {
      activeRisks.push("VI dilatado por volumen");
    }
    if (mitralRegurgitation.pulmonaryVenousFlow === "systolic-reversal") {
      activeRisks.push("reversión sistólica venosa pulmonar");
    }
  }
  if (disease.id === "infarction" && infarction.occlusiveLoad > 0.55) {
    activeRisks.push("oclusión aguda de la DA");
  }

  let stability: DerivedSimulation["stability"] = "Compensado";
  let stabilityTone: DerivedSimulation["stabilityTone"] = "stable";
  if (
    currentSystolic < 90 ||
    cardiacOutput < 2.6 ||
    (disease.id === "vt" && severity > 62) ||
    (disease.id === "infarction" && infarction.regionalDyskinesia > 0.1) ||
    (disease.id === "heart-failure" &&
      heartFailure.stage === "severe-systolic-dysfunction" &&
      cardiacOutput < 3)
  ) {
    stability = "Inestable";
    stabilityTone = "danger";
  } else if (
    disease.id === "vt" ||
    (disease.id === "infarction" && infarction.wallMotionLoss > 0.72) ||
    (disease.id === "heart-failure" && heartFailure.ejectionFraction <= 30) ||
    (disease.id === "av-block" && avBlockStage >= 3) ||
    currentSystolic < 102 ||
    cardiacOutput < 3.8 ||
    severity > 72
  ) {
    stability = "Vigilancia";
    stabilityTone = "watch";
  }

  return {
    severity,
    coronaryFlowFraction,
    supplyDemandImbalance,
    infarction,
    heartFailure,
    aorticStenosis,
    mitralRegurgitation,
    heartRate,
    atrialRate,
    avBlockStage,
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
