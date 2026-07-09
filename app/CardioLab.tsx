"use client";

import {
  Activity,
  AlertTriangle,
  BookOpen,
  CircleGauge,
  Clock3,
  Droplets,
  Eye,
  EyeOff,
  Gauge,
  HeartPulse,
  Info,
  Pause,
  Play,
  Rotate3D,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Thermometer,
  TimerReset,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { EcgMonitor } from "./EcgMonitor";
import { HeartScene } from "./HeartScene";
import {
  DEFAULT_VITALS,
  DISEASES,
  deriveSimulation,
  formatSpecific,
  getDisease,
  type Disease,
  type DiseaseId,
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

type LessonTab = "heart" | "cause" | "caution";

const SOURCES = [
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
    label: "AHA · Estenosis aórtica",
    href: "https://www.heart.org/en/health-topics/heart-valve-problems-and-disease/heart-valve-problems-and-causes/problem-aortic-valve-stenosis",
  },
  {
    label: "AHA · Insuficiencia mitral",
    href: "https://www.heart.org/en/health-topics/heart-valve-problems-and-disease/heart-valve-problems-and-causes/problem-mitral-valve-regurgitation",
  },
  {
    label: "ESC · Diagnóstico de pericarditis aguda",
    href: "https://www.escardio.org/communities/councils/cardiology-practice/scientific-documents-and-publications/ejournal/volume-15/Diagnosis-of-acute-pericarditis/",
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
        <span className="disease-family">{disease.family}</span>
      </span>
      <strong>{disease.name}</strong>
      <span className="disease-card-region">{disease.regionLabel}</span>
    </button>
  );
}

function severityLabel(value: number) {
  if (value < 34) return "leve";
  if (value < 68) return "moderada";
  return "severa";
}

function formatClinicalTime(value: number, unit: Disease["timeUnit"]) {
  if (value < 0.05) return `0 ${unit}`;
  const decimals = value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unit}`;
}

export default function CardioLab() {
  const [vitals, setVitals] = useState<Vitals>(DEFAULT_VITALS);
  const [diseaseId, setDiseaseId] = useState<DiseaseId>("afib");
  const disease = useMemo(() => getDisease(diseaseId), [diseaseId]);
  const [baseSeverity, setBaseSeverity] = useState(44);
  const [specificValue, setSpecificValue] = useState(
    getDisease("afib").specific.defaultValue,
  );
  const [clinicalTime, setClinicalTime] = useState(0);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [compareHealthy, setCompareHealthy] = useState(false);
  const [lessonTab, setLessonTab] = useState<LessonTab>("heart");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setReducedMotion(true);
      setAutoRotate(false);
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setClinicalTime((current) => Math.min(100, current + 0.035 * timeSpeed));
    }, 100);
    return () => window.clearInterval(timer);
  }, [paused, timeSpeed]);

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
    setBaseSeverity(44);
    setSpecificValue(next.specific.defaultValue);
    setClinicalTime(0);
    setLessonTab("heart");
  };

  const resetAll = () => {
    const initialDisease = getDisease("afib");
    setVitals(DEFAULT_VITALS);
    setDiseaseId("afib");
    setBaseSeverity(44);
    setSpecificValue(initialDisease.specific.defaultValue);
    setClinicalTime(0);
    setTimeSpeed(1);
    setPaused(false);
    setAutoRotate(!reducedMotion);
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
    <main className="cardio-app">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            <HeartPulse size={24} />
          </span>
          <div>
            <div className="brand-title-row">
              <h1>El Corazón de Alma</h1>
              <span className="education-badge">Simulación educativa</span>
            </div>
            <p>Aprende viendo cómo cambian electricidad, músculo y flujo.</p>
          </div>
        </div>

        <div className="live-state" aria-live="polite">
          <span className={`live-dot ${paused ? "paused" : ""}`} />
          <div>
            <span>{paused ? "Simulación pausada" : "Modelo en tiempo real"}</span>
            <strong>{disease.name}</strong>
          </div>
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
          <button type="button" className="icon-button" onClick={resetAll} aria-label="Restablecer simulación" title="Restablecer">
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="safety-banner">
        <Info size={15} />
        <span>
          Modelo didáctico simplificado: ayuda a entender relaciones, pero no diagnostica ni sustituye ECG, ecocardiografía, analítica o valoración médica.
        </span>
      </div>

      <section className="patient-section" aria-labelledby="patient-heading">
        <div className="section-title-line">
          <div>
            <span className="eyebrow">01 · Paciente simulado</span>
            <h2 id="patient-heading">Modifica las condiciones de partida</h2>
          </div>
          <div className="section-note">
            <Settings2 size={15} />
            <span>Los valores “actuales” se calculan con la patología activa.</span>
          </div>
        </div>

        <div className="vital-grid">
          <VitalControl
            icon={<HeartPulse size={17} />}
            label="FC basal"
            value={vitals.heartRate}
            min={40}
            max={160}
            step={1}
            unit="lpm"
            onChange={(value) => setVital("heartRate", value)}
            hint={`Actual: ${simulation.heartRate} lpm`}
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
            hint={vitals.temperature >= 38 ? "Fiebre: aumenta demanda y FC" : "Tendencia fisiológica suave"}
          />
          <VitalControl
            icon={<Gauge size={17} />}
            label="PA sistólica"
            value={vitals.systolic}
            min={80}
            max={210}
            step={1}
            unit="mmHg"
            onChange={(value) => setVital("systolic", Math.max(value, vitals.diastolic + 15))}
            hint={`Actual: ${simulation.currentSystolic} mmHg`}
          />
          <VitalControl
            icon={<CircleGauge size={17} />}
            label="PA diastólica"
            value={vitals.diastolic}
            min={45}
            max={125}
            step={1}
            unit="mmHg"
            onChange={(value) => setVital("diastolic", Math.min(value, vitals.systolic - 15))}
            hint={`Actual: ${simulation.currentDiastolic} · PAM ${simulation.map}`}
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
            icon={<Droplets size={17} />}
            label="LDL"
            value={vitals.ldl}
            min={55}
            max={260}
            step={1}
            unit="mg/dL"
            onChange={(value) => setVital("ldl", value)}
            hint="No cambia el latido al instante"
            tag="crónico"
          />
          <VitalControl
            icon={<Waves size={17} />}
            label="Viscosidad relativa"
            value={vitals.viscosity}
            min={0.8}
            max={1.7}
            step={0.05}
            decimals={2}
            unit="×"
            onChange={(value) => setVital("viscosity", value)}
            hint="Índice conceptual, no medición clínica"
            tag="avanzado"
          />
        </div>
      </section>

      <section className="lab-grid" aria-label="Simulación cardíaca y electrocardiograma">
        <article className="heart-panel panel-surface">
          <div className="panel-heading heart-panel-heading">
            <div>
              <span className="eyebrow">02 · Corazón 3D vivo</span>
              <h2>{disease.name}</h2>
            </div>
            <div className={`stability-pill ${simulation.stabilityTone}`}>
              {simulation.stabilityTone === "danger" && <AlertTriangle size={14} />}
              {simulation.stability}
            </div>
          </div>

          <div className="metric-ribbon" aria-label="Métricas hemodinámicas calculadas">
            <div>
              <span>Frecuencia</span>
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
            />

            <div className="heart-view-label">
              <span className="region-swatch" style={{ background: disease.color }} />
              <div>
                <span>Zona afectada</span>
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
              <button
                type="button"
                className={compareHealthy ? "active" : ""}
                onClick={() => setCompareHealthy((current) => !current)}
                aria-pressed={compareHealthy}
              >
                <Activity size={16} />
                ECG sano
              </button>
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
                  <Clock3 size={14} /> Tiempo clínico
                </span>
                <strong>{formatClinicalTime(clinicalTime, disease.timeUnit)}</strong>
              </div>
              <div className="timeline-track" aria-hidden="true">
                <span
                  style={{
                    width: `${simulation.severity}%`,
                    background: disease.color,
                  }}
                />
              </div>
            </div>

            <div className="speed-control" aria-label="Velocidad de evolución clínica">
              <span>Evolución</span>
              {[1, 5, 20].map((speed) => (
                <button
                  type="button"
                  key={speed}
                  className={timeSpeed === speed ? "active" : ""}
                  onClick={() => setTimeSpeed(speed)}
                  aria-pressed={timeSpeed === speed}
                >
                  ×{speed}
                </button>
              ))}
              <button type="button" onClick={() => setClinicalTime(0)} aria-label="Reiniciar tiempo clínico" title="Reiniciar tiempo">
                <TimerReset size={16} />
              </button>
            </div>
          </div>
        </article>

        <aside className="right-rail panel-surface">
          <EcgMonitor
            disease={disease}
            simulation={simulation}
            paused={paused}
            compareHealthy={compareHealthy}
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
            <span className="eyebrow">03 · Biblioteca de escenarios</span>
            <h2 id="disease-heading">Elige qué quieres aprender</h2>
          </div>
          <div className="dock-status" aria-live="polite">
            <span className="region-swatch" style={{ background: disease.color }} />
            <span>{disease.name}</span>
            <strong>{severityText}</strong>
          </div>
        </div>

        <div className="disease-grid" role="radiogroup" aria-label="Patologías cardiovasculares">
          {DISEASES.map((item) => (
            <DiseaseCard
              key={item.id}
              disease={item}
              selected={item.id === diseaseId}
              onSelect={() => selectDisease(item.id)}
            />
          ))}
        </div>

        <div className="disease-inspector" style={{ "--disease-color": disease.color } as CSSProperties}>
          <div className="disease-summary-block">
            <span className="disease-code large">{disease.code}</span>
            <div>
              <h3>{disease.name}</h3>
              <p>{disease.summary}</p>
            </div>
          </div>

          <label className="inspector-slider">
            <span className="inspector-slider-head">
              <span>Severidad inicial</span>
              <strong>{Math.round(baseSeverity)}% · {severityLabel(baseSeverity)}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={baseSeverity}
              onChange={(event) => setBaseSeverity(Number(event.target.value))}
            />
            <span className="range-ends"><small>Leve</small><small>Severa</small></span>
          </label>

          <label className="inspector-slider">
            <span className="inspector-slider-head">
              <span>{disease.specific.label}</span>
              <strong>{formatSpecific(disease, specificValue)}</strong>
            </span>
            <input
              type="range"
              min={disease.specific.min}
              max={disease.specific.max}
              step={disease.specific.step}
              value={specificValue}
              onChange={(event) => setSpecificValue(Number(event.target.value))}
            />
            <span className="range-ends">
              <small>{formatSpecific(disease, disease.specific.min)}</small>
              <small>{formatSpecific(disease, disease.specific.max)}</small>
            </span>
          </label>

          <div className="inspector-result">
            <span>Resultado simulado</span>
            <strong>{Math.round(simulation.severity)}%</strong>
            <small>base + variable propia + tiempo + modificadores</small>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <div>
          <ShieldAlert size={16} />
          <span>Uso docente. No introducir datos reales de pacientes ni usar para tomar decisiones clínicas.</span>
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
              La app traduce relaciones clínicas conocidas a una animación original y simplificada. No reproduce un paciente, no calcula riesgo individual y no genera ECG diagnósticos.
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
                En infarto, valvulopatías, insuficiencia cardíaca y pericarditis, el ECG es solo una pieza del diagnóstico. El contexto clínico y otras pruebas son imprescindibles.
              </span>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
