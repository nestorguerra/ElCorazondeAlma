"use client";

import {
  Activity,
  AlertTriangle,
  BookOpen,
  Clock3,
  Eye,
  EyeOff,
  Gauge,
  HeartPulse,
  Moon,
  Pause,
  Play,
  Rotate3D,
  RotateCcw,
  ShieldAlert,
  Sun,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { EcgMonitor } from "./EcgMonitor";
import { HeartScene } from "./HeartScene";
import {
  createHeartMotionTelemetry,
  type CardiacStage,
  type HeartMotionTelemetry,
} from "./heartMotion";
import {
  DEFAULT_VITALS,
  DISEASES,
  deriveSimulation,
  formatSpecific,
  getDisease,
  type Disease,
  type DiseaseId,
  type DerivedSimulation,
  type Vitals,
} from "./simulation";

type VitalControlProps = {
  icon: ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  hint?: string;
  tag?: string;
  decimals?: number;
};

type Theme = "dark" | "light";
type LessonTab = "heart" | "cause" | "caution";

const SOURCES = [
  {
    label: "ESC 2024 · Guía clínica de fibrilación auricular",
    href: "https://academic.oup.com/eurheartj/article/45/36/3314/7738779",
  },
  {
    label: "ESC 2022 · Arritmias ventriculares y muerte súbita",
    href: "https://academic.oup.com/eurheartj/article/43/40/3997/6675633",
  },
  {
    label: "ESC 2021 · Estimulación cardíaca y bloqueo AV",
    href: "https://academic.oup.com/eurheartj/article/42/35/3427/6358547",
  },
  {
    label: "ESC 2023 · Síndromes coronarios agudos y cambios del ST-T",
    href: "https://academic.oup.com/eurheartj/article/44/38/3720/7243210",
  },
  {
    label: "ACC/AHA 2025 · Guía de síndromes coronarios agudos",
    href: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001309",
  },
  {
    label: "Definición Universal de Infarto · ECG, troponina e imagen",
    href: "https://academic.oup.com/eurheartj/article/40/3/237/5079081",
  },
  {
    label: "ACC 2022 · Cambios ECG precoces y seriados en el síndrome coronario",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10691881/",
  },
  {
    label: "Consenso ECG · Oclusión aguda, reperfusión y evolución del STEMI",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6932613/",
  },
  {
    label: "ASE 2020 · Ecocardiografía de estrés y movimiento regional isquémico",
    href: "https://www.asecho.org/wp-content/uploads/2020/01/Stress-Echo-2020.pdf",
  },
  {
    label: "Echo Research & Practice · Variación latido a latido en FA",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5834126/",
  },
  {
    label: "NIH 3D · Base anatómica del corazón (3DPX-022787, dominio público)",
    href: "https://3d.nih.gov/entries/3DPX-022787",
  },
  {
    label: "AHA · Qué mide un electrocardiograma",
    href: "https://www.heart.org/en/health-topics/heart-attack/diagnosing-a-heart-attack/electrocardiogram",
  },
  {
    label: "AHA · Trastornos de conducción",
    href: "https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/conduction-disorders",
  },
  {
    label: "NHLBI · Enfermedad coronaria y placa",
    href: "https://www.nhlbi.nih.gov/health/coronary-heart-disease",
  },
  {
    label: "AHA · Fracción de eyección e insuficiencia cardíaca",
    href: "https://www.heart.org/en/health-topics/heart-failure/diagnosing-heart-failure/ejection-fraction-heart-failure-measurement",
  },
  {
    label: "Definición Universal 2026 · Fenotipos y causas de insuficiencia cardíaca",
    href: "https://academic.oup.com/eurheartj/advance-article/doi/10.1093/eurheartj/ehag500/8719720",
  },
  {
    label: "ESC 2021 · Diagnóstico y tratamiento de insuficiencia cardíaca",
    href: "https://academic.oup.com/eurheartj/article/42/36/3599/6358045",
  },
  {
    label: "AHA/ACC/HFSA 2022 · Guía de insuficiencia cardíaca",
    href: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001063",
  },
  {
    label: "ASE · Cuantificación de cámaras y volúmenes ventriculares",
    href: "https://www.asecho.org/wp-content/uploads/2018/08/WFTF-Chamber-Quantification-Summary-Doc-Final-July-18.pdf",
  },
  {
    label: "ESC/EACTS 2025 · Estenosis aórtica y valvulopatías",
    href: "https://academic.oup.com/eurheartj/article/46/44/4635/8234488",
  },
  {
    label: "EACVI/ASE · Evaluación ecocardiográfica de la estenosis aórtica",
    href: "https://www.asecho.org/wp-content/uploads/2025/04/2017ValveStenosisGuideline.pdf",
  },
  {
    label: "EHJ · Respuesta miocárdica a la sobrecarga valvular",
    href: "https://academic.oup.com/eurheartj/article/44/1/28/6724464",
  },
  {
    label: "ESC/EACTS 2025 · Insuficiencia mitral primaria",
    href: "https://academic.oup.com/eurheartj/article/46/44/4635/8234488",
  },
  {
    label: "ASE/SCMR · Cuantificación de regurgitación valvular nativa",
    href: "https://www.asecho.org/wp-content/uploads/2025/04/2017VavularRegurgitationGuideline.pdf",
  },
  {
    label: "ESC · Mecanismo y remodelado en insuficiencia mitral primaria",
    href: "https://www.escardio.org/communities/councils/cardiology-practice/education/cardiopractice/primary-mitral-regurgitation-answers-to-clinical-cardiologists-most-common-que/",
  },
  {
    label: "ESC 2025 · Guía de miocarditis y pericarditis",
    href: "https://academic.oup.com/eurheartj/article/46/40/3952/8234483",
  },
  {
    label: "ESC · Evolución del ECG en pericarditis aguda",
    href: "https://www.escardio.org/communities/councils/cardiology-practice/scientific-documents-and-publications/ejournal/volume-15/Diagnosis-of-acute-pericarditis/",
  },
  {
    label: "AHA/ACC 2024 · Guía de miocardiopatía hipertrófica",
    href: "https://www.acc.org/Guidelines/Guidelines/2024/05/08/11/09/2024-Hypertrophic-Cardiomyopathy",
  },
  {
    label: "ESC 2023 · Guía de miocardiopatías",
    href: "https://academic.oup.com/eurheartj/article/44/37/3503/7246608",
  },
  {
    label: "EACVI 2025 · Imagen multimodal en MCH",
    href: "https://academic.oup.com/ehjcimaging/article/27/3/369/8313597",
  },
  {
    label: "NCBI · Resistencia vascular y viscosidad",
    href: "https://www.ncbi.nlm.nih.gov/books/NBK538308/",
  },
];

function VitalControl({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
  tag,
  decimals = 0,
}: VitalControlProps) {
  return (
    <label className="vital-control">
      <span className="vital-control-top">
        <span className="vital-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="vital-label">{label}</span>
        {tag && <span className="vital-tag">{tag}</span>}
      </span>
      <span className="vital-reading">
        <strong>{value.toFixed(decimals)}</strong>
        <span>{unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label}: ${value.toFixed(decimals)} ${unit}`}
      />
      <span className="vital-hint">{hint ?? `${min}–${max} ${unit}`}</span>
    </label>
  );
}

function BloodPressureControl({
  systolic,
  diastolic,
  currentSystolic,
  currentDiastolic,
  map,
  onSystolicChange,
  onDiastolicChange,
}: {
  systolic: number;
  diastolic: number;
  currentSystolic: number;
  currentDiastolic: number;
  map: number;
  onSystolicChange: (value: number) => void;
  onDiastolicChange: (value: number) => void;
}) {
  return (
    <div className="vital-control blood-pressure-control">
      <span className="vital-control-top">
        <span className="vital-icon" aria-hidden="true">
          <Gauge size={17} />
        </span>
        <span className="vital-label">Presión arterial</span>
      </span>
      <span className="vital-reading">
        <strong>{currentSystolic}/{currentDiastolic}</strong>
        <span>mmHg</span>
      </span>
      <div className="blood-pressure-ranges">
        <label>
          <span>Sistólica</span>
          <input
            type="range"
            min={80}
            max={210}
            step={1}
            value={systolic}
            onChange={(event) => onSystolicChange(Number(event.target.value))}
            aria-label={`Presión sistólica: ${systolic} mmHg`}
          />
        </label>
        <label>
          <span>Diastólica</span>
          <input
            type="range"
            min={45}
            max={125}
            step={1}
            value={diastolic}
            onChange={(event) => onDiastolicChange(Number(event.target.value))}
            aria-label={`Presión diastólica: ${diastolic} mmHg`}
          />
        </label>
      </div>
      <span className="vital-hint">PAM calculada: {map} mmHg</span>
    </div>
  );
}

function DiseaseCard({
  disease,
  selected,
  onSelect,
}: {
  disease: Disease;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`disease-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      style={{ "--disease-color": disease.color } as CSSProperties}
    >
      <span className="disease-card-top">
        <span className="disease-code">{disease.code}</span>
        {disease.id === "healthy" && <span className="healthy-dot" />}
      </span>
      <strong>{disease.name}</strong>
    </button>
  );
}

function severityLabel(value: number) {
  if (value < 34) return "leve";
  if (value < 68) return "moderada";
  return "severa";
}

function severityToSpecific(disease: Disease, severity: number) {
  const visualFraction = Math.min(1, Math.max(0, severity / 100));
  const specificFraction = disease.specific.inverse
    ? 1 - visualFraction
    : visualFraction;
  const raw =
    disease.specific.min +
    (disease.specific.max - disease.specific.min) * specificFraction;
  const stepped =
    Math.round((raw - disease.specific.min) / disease.specific.step) *
      disease.specific.step +
    disease.specific.min;
  return Math.min(disease.specific.max, Math.max(disease.specific.min, stepped));
}

function defaultSeverityForDisease(disease: Disease) {
  if (disease.id === "healthy") return 0;
  const fraction =
    (disease.specific.defaultValue - disease.specific.min) /
    (disease.specific.max - disease.specific.min);
  return Math.round((disease.specific.inverse ? 1 - fraction : fraction) * 100);
}

function clinicalStage(disease: Disease, simulation: DerivedSimulation) {
  if (disease.id === "healthy") return "Referencia fisiológica";
  if (disease.id === "infarction") return simulation.infarction.stageLabel;
  if (disease.id === "heart-failure") return simulation.heartFailure.stageLabel;
  if (disease.id === "aortic-stenosis") return simulation.aorticStenosis.stageLabel;
  if (disease.id === "mitral-regurgitation") {
    return simulation.mitralRegurgitation.stageLabel;
  }
  if (disease.id === "pericarditis") return simulation.pericarditis.stageLabel;
  if (disease.id === "hcm") return simulation.hcm.stageLabel;
  return `${Math.round(simulation.severity)}% · ${severityLabel(simulation.severity)}`;
}

function clinicalDetail(disease: Disease, simulation: DerivedSimulation) {
  if (disease.id === "healthy") {
    return "Ritmo sinusal · QRS estrecho · FE conservada · contracción coordinada";
  }
  if (disease.id === "afib") {
    return `R–R variable · respuesta ventricular ${simulation.heartRate} lpm`;
  }
  if (disease.id === "vt") {
    return `TV monomórfica ${simulation.heartRate} lpm · QRS ancho · disociación AV`;
  }
  if (disease.id === "av-block") {
    return `Grado ${simulation.avBlockStage} · frecuencia ventricular ${simulation.heartRate} lpm`;
  }
  if (disease.id === "ischemia") {
    return `Flujo coronario ${Math.round(simulation.coronaryFlowFraction * 100)}% · desequilibrio aporte–demanda ${Math.round(simulation.supplyDemandImbalance * 100)}%`;
  }
  if (disease.id === "infarction") {
    return `Lesión ${Math.round(simulation.infarction.myocardialInjuryFraction * 100)}% · necrosis ${Math.round(simulation.infarction.necrosisFraction * 100)}%`;
  }
  if (disease.id === "heart-failure") {
    return `FE ${Math.round(simulation.heartFailure.ejectionFraction)}% · VTD ${Math.round(simulation.heartFailure.endDiastolicVolume)} mL · VTS ${Math.round(simulation.heartFailure.endSystolicVolume)} mL`;
  }
  if (disease.id === "aortic-stenosis") {
    return `AVA ${simulation.aorticStenosis.valveArea.toFixed(1)} cm² · Vmáx ${simulation.aorticStenosis.peakVelocity.toFixed(1)} m/s · gradiente ${Math.round(simulation.aorticStenosis.meanGradient)} mmHg`;
  }
  if (disease.id === "mitral-regurgitation") {
    return `FR ${Math.round(simulation.mitralRegurgitation.regurgitantFraction * 100)}% · volumen regurgitante ${Math.round(simulation.mitralRegurgitation.regurgitantVolume)} mL · flujo útil ${Math.round(simulation.mitralRegurgitation.forwardStrokeVolume)} mL`;
  }
  if (disease.id === "pericarditis") {
    return `ST ${Math.round(simulation.pericarditis.stElevation * 100)}% · PR ${Math.round(simulation.pericarditis.prDepression * 100)}% · inversión T ${Math.round(simulation.pericarditis.tInversion * 100)}%`;
  }
  return `Septo ${simulation.hcm.septalThickness.toFixed(0)} mm · gradiente TSVI ${Math.round(simulation.hcm.lvotGradient)} mmHg · FE ${Math.round(simulation.hcm.ejectionFraction)}%`;
}

const MOTION_FOCUS: Record<DiseaseId, string> = {
  healthy: "Aurículas y ventrículos coordinados · llenado y eyección fisiológicos",
  afib: "Sin contracción auricular útil · fuerza ventricular variable",
  vt: "Activación ventricular retardada · aurículas independientes",
  "av-block": "Aurículas regulares · conducción AV según el grado",
  ischemia: "Pared anterolateral: contracción tardía e hipocinética",
  infarction: "Núcleo anterior-apical: hipocinesia → akinesia",
  "heart-failure": "VI dilatado: acortamiento y engrosamiento global reducidos",
  "aortic-stenosis": "Eyección prolongada · VI con hipertrofia concéntrica",
  "mitral-regurgitation": "Sístole: flujo aórtico útil + chorro retrógrado hacia AI",
  pericarditis: "Miocardio conservado · pericardio inflamado, sin taponamiento",
  hcm: "Septo hipertrófico + SAM mitral · obstrucción sistólica tardía",
};

const STAGE_LABELS: Record<CardiacStage, string> = {
  atria: "Aurículas",
  ventricles: "Ventrículos",
  filling: "Llenado",
};

function CardiacMotionGuide({
  telemetry,
  disease,
  simulation,
  paused,
  reducedMotion,
}: {
  telemetry: HeartMotionTelemetry;
  disease: Disease;
  simulation: DerivedSimulation;
  paused: boolean;
  reducedMotion: boolean;
}) {
  const [stage, setStage] = useState<CardiacStage>(telemetry.stage);
  const [rhythmBeat, setRhythmBeat] = useState({
    beatIndex: telemetry.beatIndex,
    rrIntervalMs: telemetry.rrIntervalMs,
    ventricularStrength: telemetry.ventricularStrength,
    atrialRate: telemetry.atrialRate,
    avBlockStage: telemetry.avBlockStage,
    avDropped: telemetry.avDropped,
    ventricularEscape: telemetry.ventricularEscape,
  });
  const lastStage = useRef<CardiacStage>(telemetry.stage);
  const lastBeat = useRef(Number.NaN);
  const lastAvState = useRef("");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (telemetry.stage !== lastStage.current) {
        lastStage.current = telemetry.stage;
        setStage(telemetry.stage);
      }
      const avState = `${telemetry.avBlockStage}-${telemetry.avDropped}-${telemetry.ventricularEscape}-${telemetry.beatIndex}`;
      if (
        ((disease.id === "afib" || disease.id === "vt") &&
          telemetry.beatIndex !== lastBeat.current) ||
        (disease.id === "av-block" && avState !== lastAvState.current)
      ) {
        lastBeat.current = telemetry.beatIndex;
        lastAvState.current = avState;
        setRhythmBeat({
          beatIndex: telemetry.beatIndex,
          rrIntervalMs: telemetry.rrIntervalMs,
          ventricularStrength: telemetry.ventricularStrength,
          atrialRate: telemetry.atrialRate,
          avBlockStage: telemetry.avBlockStage,
          avDropped: telemetry.avDropped,
          ventricularEscape: telemetry.ventricularEscape,
        });
      }
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [disease.id, telemetry]);

  const movementPaused = paused || reducedMotion;

  return (
    <div
      className={`heart-motion-guide ${movementPaused ? "paused" : ""}`}
      style={{ "--motion-color": disease.color } as CSSProperties}
      data-motion-stage={movementPaused ? "paused" : stage}
      aria-label={`Ciclo cardíaco. ${MOTION_FOCUS[disease.id]}`}
    >
      <span className="motion-guide-kicker">Ciclo cardíaco</span>
      <div className="motion-stage-row" aria-hidden="true">
        {(Object.keys(STAGE_LABELS) as CardiacStage[]).map((key) => (
          <span
            key={key}
            className={`motion-stage ${!movementPaused && stage === key ? "active" : ""}`}
          >
            <i />
            {STAGE_LABELS[key]}
          </span>
        ))}
      </div>
      <strong>{movementPaused ? "Movimiento pausado" : MOTION_FOCUS[disease.id]}</strong>
      {disease.id === "afib" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>R–R {Math.round(rhythmBeat.rrIntervalMs)} ms</span>
          <span>Fuerza {Math.round(rhythmBeat.ventricularStrength * 100)}%</span>
        </span>
      )}
      {disease.id === "vt" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>Aurículas {Math.round(rhythmBeat.atrialRate)} lpm</span>
          <span>Ventrículos {Math.round(60_000 / Math.max(1, rhythmBeat.rrIntervalMs))} lpm</span>
        </span>
      )}
      {disease.id === "av-block" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>A {Math.round(rhythmBeat.atrialRate)} · V {Math.round(60_000 / Math.max(1, rhythmBeat.rrIntervalMs))} lpm</span>
          <span>
            {rhythmBeat.avBlockStage === 4
              ? "Escape ventricular"
              : rhythmBeat.avDropped
                ? "Impulso bloqueado"
                : "Impulso conducido"}
          </span>
        </span>
      )}
      {disease.id === "ischemia" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>
            Flujo coronario relativo {Math.round(simulation.coronaryFlowFraction * 100)}%
          </span>
          <span>
            Desequilibrio aporte–demanda {Math.round(simulation.supplyDemandImbalance * 100)}%
          </span>
        </span>
      )}
      {disease.id === "infarction" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>{simulation.infarction.stageLabel}</span>
          <span>
            Oclusión {Math.round(simulation.infarction.occlusionFraction * 100)}%
            {" · "}Necrosis {Math.round(simulation.infarction.necrosisFraction * 100)}%
          </span>
        </span>
      )}
      {disease.id === "heart-failure" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>FE {Math.round(simulation.heartFailure.ejectionFraction)}%</span>
          <span>
            VTD {Math.round(simulation.heartFailure.endDiastolicVolume)} · VTS{" "}
            {Math.round(simulation.heartFailure.endSystolicVolume)} mL
          </span>
        </span>
      )}
      {disease.id === "aortic-stenosis" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>
            AVA {simulation.aorticStenosis.valveArea.toFixed(1)} cm² · Vmáx{" "}
            {simulation.aorticStenosis.peakVelocity.toFixed(1)} m/s
          </span>
          <span>
            Gradiente medio {Math.round(simulation.aorticStenosis.meanGradient)} mmHg
            {" · "}VI ≈ {Math.round(simulation.aorticStenosis.lvSystolicPressure)} mmHg
          </span>
        </span>
      )}
      {disease.id === "mitral-regurgitation" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>
            Volumen total {Math.round(simulation.mitralRegurgitation.totalStrokeVolume)} ·
            regurgitante {Math.round(simulation.mitralRegurgitation.regurgitantVolume)} mL
          </span>
          <span>
            Volumen aórtico útil {Math.round(simulation.mitralRegurgitation.forwardStrokeVolume)} mL
            {" · "}FE total {Math.round(simulation.mitralRegurgitation.ejectionFraction)}%
          </span>
        </span>
      )}
      {disease.id === "pericarditis" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>{simulation.pericarditis.stageLabel}</span>
          <span>
            Inflamación {Math.round(simulation.pericarditis.inflammationFraction * 100)}%
            {" · "}Contracción miocárdica conservada
          </span>
        </span>
      )}
      {disease.id === "hcm" && !movementPaused && (
        <span className="rhythm-motion-readout">
          <span>
            Septo {simulation.hcm.septalThickness.toFixed(0)} mm · TSVI{" "}
            {Math.round(simulation.hcm.lvotGradient)} mmHg
          </span>
          <span>
            SAM {Math.round(simulation.hcm.systolicAnteriorMotion * 100)}%
            {" · "}FE {Math.round(simulation.hcm.ejectionFraction)}%
            {" · "}flujo útil {Math.round(simulation.hcm.forwardStrokeVolume)} mL
          </span>
        </span>
      )}
    </div>
  );
}

function formatClinicalTime(value: number, unit: Disease["timeUnit"]) {
  if (value < 0.05) return `0 ${unit}`;
  const decimals = value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unit}`;
}

export default function CardioLab() {
  const [vitals, setVitals] = useState<Vitals>(DEFAULT_VITALS);
  const [diseaseId, setDiseaseId] = useState<DiseaseId>("healthy");
  const disease = useMemo(() => getDisease(diseaseId), [diseaseId]);
  const [diseaseSeverity, setDiseaseSeverity] = useState(0);
  const baseSeverity = diseaseSeverity;
  const specificValue = useMemo(
    () => severityToSpecific(disease, diseaseSeverity),
    [disease, diseaseSeverity],
  );
  const [clinicalTime, setClinicalTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [compareHealthy, setCompareHealthy] = useState(false);
  const [lessonTab, setLessonTab] = useState<LessonTab>("heart");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const motionTelemetry = useMemo(() => createHeartMotionTelemetry(), []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectSystemPreference = () => {
      if (!media.matches) return;
      setReducedMotion(true);
      setAutoRotate(false);
    };
    const timer = media.matches
      ? window.setTimeout(respectSystemPreference, 0)
      : undefined;
    media.addEventListener("change", respectSystemPreference);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      media.removeEventListener("change", respectSystemPreference);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("corazon-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setClinicalTime((current) => Math.min(100, current + 0.0875));
    }, 250);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (!sourcesOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSourcesOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sourcesOpen]);

  const simulation = useMemo(
    () =>
      deriveSimulation(
        vitals,
        disease,
        baseSeverity,
        specificValue,
        clinicalTime,
      ),
    [baseSeverity, clinicalTime, disease, specificValue, vitals],
  );

  const setVital = useCallback(
    <Key extends keyof Vitals>(key: Key, value: Vitals[Key]) => {
      setVitals((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const selectDisease = (nextId: DiseaseId) => {
    const next = getDisease(nextId);
    setDiseaseId(nextId);
    setDiseaseSeverity(defaultSeverityForDisease(next));
    setClinicalTime(0);
    setCompareHealthy(false);
    setLessonTab("heart");
  };

  const resetAll = () => {
    setVitals(DEFAULT_VITALS);
    setDiseaseId("healthy");
    setDiseaseSeverity(0);
    setClinicalTime(0);
    setPaused(false);
    setAutoRotate(false);
    setCompareHealthy(false);
    setLessonTab("heart");
  };

  const lessonText =
    lessonTab === "heart"
      ? disease.heartLesson
      : lessonTab === "cause"
        ? disease.causalLesson
        : disease.caveat;

  const severityText = severityLabel(simulation.severity);

  return (
    <main className="cardio-app" data-theme={theme}>
      <header className="app-header">
        <div className="brand-block">
          <h1>El Corazón de Alma</h1>
        </div>

        <div className="header-actions">
          <button type="button" className="icon-button text-button" onClick={() => setSourcesOpen(true)}>
            <BookOpen size={17} />
            <span>Base médica</span>
          </button>
          <button
            type="button"
            className={`icon-button ${reducedMotion ? "active" : ""}`}
            onClick={() => {
              setReducedMotion((current) => !current);
              setAutoRotate(false);
            }}
            aria-pressed={reducedMotion}
            aria-label={reducedMotion ? "Activar movimiento" : "Reducir movimiento"}
            title={reducedMotion ? "Activar movimiento" : "Reducir movimiento"}
          >
            {reducedMotion ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="icon-button" onClick={resetAll} aria-label="Restablecer simulación" title="Restablecer">
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <section className="patient-section" aria-labelledby="patient-heading">
        <div className="section-title-line">
          <div>
            <span className="eyebrow">Constantes clínicas</span>
            <h2 id="patient-heading">Condiciones de partida esenciales</h2>
          </div>
        </div>

        <div className="vital-grid">
          <VitalControl
            icon={<HeartPulse size={17} />}
            label="Frecuencia basal"
            value={vitals.heartRate}
            min={40}
            max={160}
            step={1}
            unit="lpm"
            onChange={(value) => setVital("heartRate", value)}
            hint={
              disease.id === "vt" || disease.id === "av-block"
                ? `Auricular actual: ${simulation.atrialRate} lpm`
                : `Actual: ${simulation.heartRate} lpm`
            }
          />
          <BloodPressureControl
            systolic={vitals.systolic}
            diastolic={vitals.diastolic}
            currentSystolic={simulation.currentSystolic}
            currentDiastolic={simulation.currentDiastolic}
            map={simulation.map}
            onSystolicChange={(value) =>
              setVital("systolic", Math.max(value, vitals.diastolic + 15))
            }
            onDiastolicChange={(value) =>
              setVital("diastolic", Math.min(value, vitals.systolic - 15))
            }
          />
          <VitalControl
            icon={<Wind size={17} />}
            label="SpO₂"
            value={vitals.spo2}
            min={78}
            max={100}
            step={1}
            unit="%"
            onChange={(value) => setVital("spo2", value)}
            hint="Aporte sistémico de oxígeno"
          />
          <VitalControl
            icon={<Thermometer size={17} />}
            label="Temperatura"
            value={vitals.temperature}
            min={35}
            max={41}
            step={0.1}
            decimals={1}
            unit="°C"
            onChange={(value) => setVital("temperature", value)}
            hint={vitals.temperature >= 38 ? "Fiebre: aumenta demanda y FC" : "Situación basal afebril"}
          />
        </div>
      </section>

      <section className="lab-grid" aria-label="Simulación cardíaca y electrocardiograma">
        <article className="heart-panel panel-surface">
          <div className="panel-heading heart-panel-heading">
            <div>
              <span className="eyebrow">Corazón 3D en tiempo real</span>
              <h2>{disease.name}</h2>
            </div>
            <div className={`stability-pill ${simulation.stabilityTone}`}>
              {simulation.stabilityTone === "danger" && <AlertTriangle size={14} />}
              {simulation.stability}
            </div>
          </div>

          <div className="metric-ribbon" aria-label="Métricas hemodinámicas calculadas">
            <div>
              <span>
                {disease.id === "vt"
                  ? "Frecuencia ventricular"
                  : disease.id === "av-block"
                    ? "Frecuencia ventricular media"
                    : "Frecuencia"}
              </span>
              <strong>{simulation.heartRate}</strong>
              <small>lpm</small>
            </div>
            <div>
              <span>Presión actual</span>
              <strong>{simulation.currentSystolic}/{simulation.currentDiastolic}</strong>
              <small>mmHg</small>
            </div>
            <div>
              <span>Fracción eyección</span>
              <strong>{Math.round(simulation.ejectionFraction)}</strong>
              <small>%</small>
            </div>
            <div>
              <span>Gasto cardíaco</span>
              <strong>{simulation.cardiacOutput.toFixed(1)}</strong>
              <small>L/min</small>
            </div>
          </div>

          <div className="heart-viewport">
            <HeartScene
              disease={disease}
              simulation={simulation}
              paused={paused}
              autoRotate={autoRotate}
              reducedMotion={reducedMotion}
              motionTelemetry={motionTelemetry}
            />

            <CardiacMotionGuide
              telemetry={motionTelemetry}
              disease={disease}
              simulation={simulation}
              paused={paused}
              reducedMotion={reducedMotion}
            />

            <div className="heart-view-label">
              <span className="region-swatch" style={{ background: disease.color }} />
              <div>
                <span>{disease.id === "healthy" ? "Referencia" : "Zona afectada"}</span>
                <strong>{disease.regionLabel}</strong>
              </div>
            </div>

            <div className="heart-navigation-hint">
              <Rotate3D size={15} />
              <span>Arrastra para girar · rueda para acercar</span>
            </div>

            <div className="heart-viewport-actions">
              <button
                type="button"
                className={autoRotate ? "active" : ""}
                onClick={() => setAutoRotate((current) => !current)}
                aria-pressed={autoRotate}
              >
                <Rotate3D size={16} />
                Giro 360°
              </button>
              {disease.id !== "healthy" && (
                <button
                  type="button"
                  className={compareHealthy ? "active" : ""}
                  onClick={() => setCompareHealthy((current) => !current)}
                  aria-pressed={compareHealthy}
                >
                  <Activity size={16} />
                  Comparar ECG sano
                </button>
              )}
            </div>
          </div>

          <div className="playback-bar">
            <button
              type="button"
              className="play-button"
              onClick={() => setPaused((current) => !current)}
              aria-label={paused ? "Reanudar simulación" : "Pausar simulación"}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
              <span>{paused ? "Reanudar" : "Pausar"}</span>
            </button>

            <div className="timeline-status">
              <div className="timeline-label-row">
                <span>
                  <Clock3 size={14} /> {disease.id === "healthy" ? "Referencia continua" : "Evolución clínica"}
                </span>
                <strong>
                  {disease.id === "healthy"
                    ? "ritmo estable"
                    : formatClinicalTime(clinicalTime, disease.timeUnit)}
                </strong>
              </div>
              <div className="timeline-track" aria-hidden="true">
                <span
                  style={{
                    width: `${disease.id === "healthy" ? 100 : simulation.severity}%`,
                    background: disease.color,
                  }}
                />
              </div>
            </div>

            <span className="playback-note">
              La gravedad se controla con un único ajuste en la explicación inferior.
            </span>
          </div>
        </article>

        <aside className="right-rail panel-surface">
          <EcgMonitor
            disease={disease}
            simulation={simulation}
            paused={paused}
            compareHealthy={compareHealthy}
            motionTelemetry={motionTelemetry}
            reducedMotion={reducedMotion}
            theme={theme}
          />

          <div className="lesson-module">
            <div className="lesson-tabs" role="tablist" aria-label="Explicación didáctica">
              <button
                type="button"
                role="tab"
                aria-selected={lessonTab === "heart"}
                className={lessonTab === "heart" ? "active" : ""}
                onClick={() => setLessonTab("heart")}
              >
                Corazón
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={lessonTab === "cause"}
                className={lessonTab === "cause" ? "active" : ""}
                onClick={() => setLessonTab("cause")}
              >
                Mecanismo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={lessonTab === "caution"}
                className={lessonTab === "caution" ? "active" : ""}
                onClick={() => setLessonTab("caution")}
              >
                Cautela
              </button>
            </div>

            <div className="lesson-content" role="tabpanel" aria-live="polite">
              <span className="look-number">02</span>
              <div>
                <strong>
                  {lessonTab === "heart"
                    ? "Qué cambia en el movimiento"
                    : lessonTab === "cause"
                      ? "Cómo se conectan las variables"
                      : "Qué no debes concluir"}
                </strong>
                <p>{lessonText}</p>
              </div>
            </div>

            <div className="risk-summary">
              <div className="risk-summary-head">
                <span>
                  <Zap size={15} /> Modificadores activos
                </span>
                <strong>{Math.round(simulation.riskIndex * 100)}%</strong>
              </div>
              {simulation.activeRisks.length > 0 ? (
                <div className="risk-chips">
                  {simulation.activeRisks.map((risk) => (
                    <span key={risk}>{risk}</span>
                  ))}
                </div>
              ) : (
                <p>Sin modificadores fisiológicos relevantes sobre el escenario basal.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="disease-dock" aria-labelledby="disease-heading">
        <div className="section-title-line disease-title-line">
          <div>
            <span className="eyebrow">Condición cardíaca</span>
            <h2 id="disease-heading">Compara el corazón sano con cada enfermedad</h2>
          </div>
          <div className="dock-status" aria-live="polite">
            <span className="region-swatch" style={{ background: disease.color }} />
            <span>{disease.name}</span>
            <strong>{disease.id === "healthy" ? "referencia" : severityText}</strong>
          </div>
        </div>

        <div className="disease-grid" role="radiogroup" aria-label="Condiciones cardíacas">
          {DISEASES.map((item) => (
            <DiseaseCard
              key={item.id}
              disease={item}
              selected={item.id === diseaseId}
              onSelect={() => selectDisease(item.id)}
            />
          ))}
        </div>

        <div
          className={`disease-inspector ${disease.id === "healthy" ? "healthy" : ""}`}
          style={{ "--disease-color": disease.color } as CSSProperties}
        >
          <div className="disease-summary-block">
            <span className="disease-code large">{disease.code}</span>
            <div>
              <h3>{disease.name}</h3>
              <p>{disease.summary}</p>
            </div>
          </div>

          <label className="inspector-slider" hidden={disease.id === "healthy"}>
            <span className="inspector-slider-head">
              <span>Gravedad del escenario</span>
              <strong>
                {Math.round(diseaseSeverity)}% · {severityLabel(diseaseSeverity)}
              </strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={diseaseSeverity}
              onChange={(event) => {
                setDiseaseSeverity(Number(event.target.value));
                setClinicalTime(0);
              }}
            />
            <span className="range-ends">
              <small>Leve</small>
              <small>{disease.specific.label}: {formatSpecific(disease, specificValue)}</small>
              <small>Grave</small>
            </span>
          </label>

          <div className="inspector-result">
            <span>
              {disease.id === "healthy"
                ? "Estado de referencia"
                : disease.id === "ischemia"
                ? "Carga isquémica simulada"
                : disease.id === "infarction"
                  ? "Fase electro-mecánica"
                  : disease.id === "heart-failure"
                    ? "Estado ventricular"
                    : disease.id === "aortic-stenosis"
                      ? "Clasificación integrada"
                      : disease.id === "mitral-regurgitation"
                        ? "Grado integrado de IM"
                      : disease.id === "pericarditis"
                        ? "Fase ECG y pericárdica"
                      : disease.id === "hcm"
                        ? "Fenotipo obstructivo integrado"
                : disease.id === "afib" ||
                    disease.id === "vt" ||
                    disease.id === "av-block"
                  ? "Compromiso hemodinámico simulado"
                  : "Resultado simulado"}
            </span>
            <strong
              className={
                disease.id === "infarction" ||
                disease.id === "heart-failure" ||
                disease.id === "aortic-stenosis" ||
                disease.id === "mitral-regurgitation" ||
                disease.id === "pericarditis" ||
                disease.id === "hcm"
                  ? "stage-label"
                  : undefined
              }
            >
              {disease.id === "healthy"
                ? "Fisiología normal"
                : disease.id === "infarction"
                ? simulation.infarction.stageLabel
                : disease.id === "heart-failure"
                  ? simulation.heartFailure.stageLabel
                  : disease.id === "aortic-stenosis"
                    ? simulation.aorticStenosis.stageLabel
                    : disease.id === "mitral-regurgitation"
                      ? simulation.mitralRegurgitation.stageLabel
                    : disease.id === "pericarditis"
                      ? simulation.pericarditis.stageLabel
                    : disease.id === "hcm"
                      ? simulation.hcm.stageLabel
                : `${Math.round(simulation.severity)}%`}
            </strong>
            <small>
              {disease.id === "healthy"
                ? clinicalDetail(disease, simulation)
                : disease.id === "afib"
                ? "impacto basal + tiempo + modificadores; no mide ‘cantidad de fibrilación’"
                : disease.id === "vt"
                  ? "impacto basal + frecuencia ventricular + tiempo + modificadores"
                  : disease.id === "av-block"
                    ? "impacto basal + grado de bloqueo + bradicardia resultante"
                  : disease.id === "ischemia"
                    ? "reducción de flujo + demanda (FC × presión sistólica) + oxigenación + tiempo"
                    : disease.id === "infarction"
                      ? `oclusión persistente · lesión ${Math.round(simulation.infarction.myocardialInjuryFraction * 100)}% · necrosis ${Math.round(simulation.infarction.necrosisFraction * 100)}%`
                      : disease.id === "heart-failure"
                        ? `FE = (VTD − VTS) / VTD · volumen residual ${Math.round(simulation.heartFailure.residualVolumeFraction * 100)}%`
                      : disease.id === "aortic-stenosis"
                        ? `AVA ${simulation.aorticStenosis.valveArea.toFixed(1)} cm² · Vmáx ${simulation.aorticStenosis.peakVelocity.toFixed(1)} m/s · gradiente medio ${Math.round(simulation.aorticStenosis.meanGradient)} mmHg · SVi ${Math.round(simulation.aorticStenosis.strokeVolumeIndex)} mL/m² · FE ${Math.round(simulation.aorticStenosis.ejectionFraction)}%`
                      : disease.id === "mitral-regurgitation"
                        ? `FR ${Math.round(simulation.mitralRegurgitation.regurgitantFraction * 100)}% · VReg ${Math.round(simulation.mitralRegurgitation.regurgitantVolume)} mL · ORE ${simulation.mitralRegurgitation.effectiveRegurgitantOrificeArea.toFixed(2)} cm² · flujo útil ${Math.round(simulation.mitralRegurgitation.forwardStrokeVolume)} mL · FE total ${Math.round(simulation.mitralRegurgitation.ejectionFraction)}%`
                      : disease.id === "pericarditis"
                        ? `ST ${Math.round(simulation.pericarditis.stElevation * 100)}% · PR ${Math.round(simulation.pericarditis.prDepression * 100)}% · inversión T ${Math.round(simulation.pericarditis.tInversion * 100)}% · sin derrame ni taponamiento`
                      : disease.id === "hcm"
                        ? `septo ${simulation.hcm.septalThickness.toFixed(0)} mm · relación septo/pared ${simulation.hcm.asymmetryRatio.toFixed(1)} · Vmáx TSVI ${simulation.hcm.peakVelocity.toFixed(1)} m/s · gradiente ${Math.round(simulation.hcm.lvotGradient)} mmHg · VTD ${Math.round(simulation.hcm.endDiastolicVolume)} mL · FE ${Math.round(simulation.hcm.ejectionFraction)}%`
                    : "base + variable propia + tiempo + modificadores"}
            </small>
          </div>
        </div>

        <div
          className="condition-explanation"
          style={{ "--disease-color": disease.color } as CSSProperties}
          aria-live="polite"
        >
          <div className="condition-explanation-heading">
            <div>
              <span className="eyebrow">
                {disease.id === "healthy" ? "Punto de partida" : "Explicación clínica"}
              </span>
              <h3>¿En qué consiste {disease.name.toLowerCase()}?</h3>
              <p>{disease.summary}</p>
            </div>
            <div className="clinical-snapshot">
              <span>Lectura actual</span>
              <strong>{clinicalStage(disease, simulation)}</strong>
              <small>{clinicalDetail(disease, simulation)}</small>
            </div>
          </div>

          <div className="condition-learning-grid">
            <article>
              <span>Movimiento y anatomía</span>
              <p>{disease.heartLesson}</p>
            </article>
            <article>
              <span>Qué ocurre en el ECG</span>
              <p>{disease.ecgLesson}</p>
            </article>
            <article>
              <span>Mecanismo principal</span>
              <p>{disease.causalLesson}</p>
            </article>
            <article className="condition-caution">
              <span>Límite clínico</span>
              <p>{disease.caveat}</p>
            </article>
          </div>

          {disease.id !== "healthy" && simulation.activeRisks.length > 0 && (
            <div className="active-factors">
              <strong>Factores activos</strong>
              <div className="risk-chips">
                {simulation.activeRisks.map((risk) => (
                  <span key={risk}>{risk}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="app-footer">
        <div>
          <ShieldAlert size={16} />
          <span>Uso docente: no diagnostica ni sustituye valoración médica. No introduzcas datos reales de pacientes.</span>
        </div>
        <button type="button" onClick={() => setSourcesOpen(true)}>
          Fuentes y límites del modelo
        </button>
      </footer>

      {sourcesOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSourcesOpen(false)}>
          <section
            className="sources-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sources-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">Transparencia clínica</span>
                <h2 id="sources-title">Base médica y límites</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setSourcesOpen(false)} aria-label="Cerrar fuentes">
                ×
              </button>
            </div>
            <p>
              La app combina una malla anatómica de alta definición con capas visuales originales para mostrar movimiento, vasos y zonas afectadas. No reproduce un paciente, no calcula riesgo individual y no genera ECG diagnósticos.
            </p>
            <div className="source-list">
              {SOURCES.map((source) => (
                <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
                  <span>{source.label}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
            <div className="modal-warning">
              <ShieldAlert size={18} />
              <span>
                En FA, el diagnóstico requiere documentar el ritmo en un ECG. En el resto de escenarios, el contexto clínico y otras pruebas siguen siendo imprescindibles.
              </span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
