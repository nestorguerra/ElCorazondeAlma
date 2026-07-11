"use client";

import { useEffect, useRef, useState } from "react";
import { getAfibBeat } from "./afibModel";
import { avBlockEcgValue } from "./avBlockModel";
import type { HeartMotionTelemetry } from "./heartMotion";
import { ischemiaEcgValue } from "./ischemiaModel";
import { infarctionEcgValue } from "./infarctionModel";
import type { Disease, DerivedSimulation, EcgPattern } from "./simulation";
import { vtEcgValue, type EcgLead as Lead } from "./vtModel";

type EcgMonitorProps = {
  disease: Disease;
  simulation: DerivedSimulation;
  paused: boolean;
  compareHealthy: boolean;
  motionTelemetry: HeartMotionTelemetry;
  reducedMotion: boolean;
};

type EcgRuntime = {
  disease: Disease;
  simulation: DerivedSimulation;
  paused: boolean;
  compareHealthy: boolean;
  reducedMotion: boolean;
  lead: Lead;
};

function gaussian(x: number, center: number, width: number) {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function plateau(x: number, start: number, end: number, edge = 0.012) {
  return sigmoid((x - start) / edge) - sigmoid((x - end) / edge);
}

function leadModifier(lead: Lead, pattern: EcgPattern) {
  if (lead === "V2") {
    if (pattern === "hcm") return 1.16;
    return 0.9;
  }
  if (lead === "V5") {
    if (pattern === "aortic-stenosis" || pattern === "hcm") return 1.22;
    return 1.05;
  }
  return 1;
}

function baseWave(phase: number, lead: Lead) {
  const polarity = lead === "V2" ? 0.84 : 1;
  const p = 0.13 * gaussian(phase, 0.15, 0.026);
  const q = -0.13 * gaussian(phase, 0.288, 0.012);
  const r = 1.12 * gaussian(phase, 0.31, 0.009);
  const s = -0.34 * gaussian(phase, 0.335, 0.013);
  const t = 0.34 * gaussian(phase, 0.58, 0.06);
  return (p + q + r + s + t) * polarity;
}

export function afibEcgValue(
  time: number,
  heartRate: number,
  lead: Lead,
  irregularity = 0.78,
) {
  const rhythmPosition = (time * Math.max(28, heartRate)) / 60;
  const beat = getAfibBeat(rhythmPosition, irregularity);
  const secondsSinceBeat = (beat.elapsed * 60) / Math.max(28, heartRate);
  const atrialAmplitude = lead === "V2" ? 0.052 : lead === "DII" ? 0.034 : 0.024;
  const fibrillatoryBaseline =
    atrialAmplitude *
    (Math.sin(time * Math.PI * 2 * 6.2 + 0.34 * Math.sin(time * 1.7)) +
      0.46 * Math.sin(time * Math.PI * 2 * 8.7 + 1.2) +
      0.22 * Math.sin(time * Math.PI * 2 * 10.1 + 2.35));

  const morphology =
    lead === "V2"
      ? { q: -0.04, r: 0.48, s: -0.72, t: 0.13 }
      : lead === "V5"
        ? { q: -0.08, r: 1.08, s: -0.2, t: 0.32 }
        : { q: -0.11, r: 1.04, s: -0.3, t: 0.27 };
  const qrs =
    morphology.q * gaussian(secondsSinceBeat, 0.015, 0.006) +
    morphology.r * gaussian(secondsSinceBeat, 0.031, 0.008) +
    morphology.s * gaussian(secondsSinceBeat, 0.052, 0.011);
  const tWave =
    morphology.t *
    (0.92 + (beat.ventricularStrength - 0.94) * 0.22) *
    gaussian(secondsSinceBeat, 0.27, 0.065);

  return qrs + tWave + fibrillatoryBaseline;
}

function ecgValue(
  time: number,
  pattern: EcgPattern,
  simulation: DerivedSimulation,
  lead: Lead,
  healthy = false,
) {
  const {
    heartRate,
    atrialRate,
    avBlockStage,
    severity,
    rhythmIrregularity,
  } = simulation;
  const severity01 = healthy ? 0 : severity / 100;
  const safeRate = healthy ? 72 : heartRate;
  const period = 60 / Math.max(28, safeRate);
  const local = time / period;
  const phase = ((local % 1) + 1) % 1;
  const modifier = leadModifier(lead, pattern);

  if (healthy) return baseWave(phase, lead) * 0.82;

  if (pattern === "vt") {
    return vtEcgValue(time, heartRate, atrialRate, lead);
  }

  if (pattern === "afib") {
    return afibEcgValue(time, heartRate, lead, rhythmIrregularity);
  }

  if (pattern === "av-block") {
    return avBlockEcgValue(
      time,
      atrialRate,
      heartRate,
      avBlockStage,
      lead,
    );
  }

  if (pattern === "ischemia") {
    return ischemiaEcgValue(time, safeRate, severity01, lead);
  }

  if (pattern === "infarction") {
    return infarctionEcgValue(time, safeRate, lead, simulation.infarction);
  }

  let value = baseWave(phase, lead);

  if (pattern === "heart-failure") {
    value *= 1 - severity01 * 0.18;
    value += 0.22 * severity01 * gaussian(phase, 0.35, 0.035);
    value -= 0.22 * severity01 * gaussian(phase, 0.59, 0.075);
  } else if (pattern === "aortic-stenosis") {
    value += 0.78 * severity01 * gaussian(phase, 0.31, 0.012);
    value -= 0.48 * severity01 * gaussian(phase, 0.344, 0.018);
    if (lead === "V5") value -= 0.34 * severity01 * gaussian(phase, 0.59, 0.07);
  } else if (pattern === "mitral-regurgitation") {
    value += 0.1 * severity01 * gaussian(phase, 0.19, 0.023);
    value += 0.05 * severity01 * plateau(phase, 0.14, 0.2, 0.012);
  } else if (pattern === "pericarditis") {
    const diffuse = lead === "V2" ? 0.88 : 1;
    value -= 0.1 * severity01 * diffuse * plateau(phase, 0.18, 0.27, 0.013);
    value += 0.3 * severity01 * diffuse * plateau(phase, 0.35, 0.52, 0.024);
  } else if (pattern === "hcm") {
    value += 0.82 * severity01 * gaussian(phase, 0.31, 0.01);
    value -= 0.4 * severity01 * gaussian(phase, 0.275, 0.018);
    value -= 0.5 * severity01 * gaussian(phase, 0.59, 0.068);
  }

  return value * modifier;
}

export function EcgMonitor({
  disease,
  simulation,
  paused,
  compareHealthy,
  motionTelemetry,
  reducedMotion,
}: EcgMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const [lead, setLead] = useState<Lead>("DII");
  const runtimeRef = useRef<EcgRuntime>({
    disease,
    simulation,
    paused,
    compareHealthy,
    reducedMotion,
    lead,
  });

  useEffect(() => {
    runtimeRef.current = {
      disease,
      simulation,
      paused,
      compareHealthy,
      reducedMotion,
      lead,
    };
  }, [compareHealthy, disease, lead, paused, reducedMotion, simulation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const secondsVisible = 5;
    const drawGrid = (amplitude: number) => {
      context.fillStyle = "#07141b";
      context.fillRect(0, 0, width, height);
      const horizontalSmallBox = (width / secondsVisible) * 0.04;
      const verticalSmallBox = amplitude * 0.1;
      for (let index = 0, x = 0; x <= width; index += 1, x = index * horizontalSmallBox) {
        const major = index % 5 === 0;
        context.strokeStyle = major ? "rgba(78, 209, 183, 0.14)" : "rgba(78, 209, 183, 0.055)";
        context.lineWidth = major ? 1 : 0.6;
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, height);
        context.stroke();
      }
      for (let index = 0, y = 0; y <= height; index += 1, y = index * verticalSmallBox) {
        const major = index % 5 === 0;
        context.strokeStyle = major ? "rgba(78, 209, 183, 0.14)" : "rgba(78, 209, 183, 0.055)";
        context.lineWidth = major ? 1 : 0.6;
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
        context.stroke();
      }
    };

    const drawTrace = (healthy: boolean, runtime: EcgRuntime) => {
      const baseline = height * 0.53;
      const amplitude = Math.min(64, height * 0.31);
      context.beginPath();
      for (let x = 0; x <= width; x += 1.5) {
        const sampleTime = timeRef.current - secondsVisible + (x / width) * secondsVisible;
        const sample = ecgValue(
          sampleTime,
          runtime.disease.pattern,
          runtime.simulation,
          runtime.lead,
          healthy,
        );
        const y = baseline - sample * amplitude;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = healthy ? "rgba(162, 182, 192, 0.36)" : "#52e6bc";
      context.lineWidth = healthy ? 1.15 : 2.2;
      context.shadowColor = healthy ? "transparent" : "rgba(82, 230, 188, 0.58)";
      context.shadowBlur = healthy ? 0 : 8;
      context.stroke();
      context.shadowBlur = 0;
    };

    const draw = (timestamp: number) => {
      const runtime = runtimeRef.current;
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      const delta = Math.min(0.05, (timestamp - lastFrameRef.current) / 1000);
      lastFrameRef.current = timestamp;
      if (!runtime.paused && document.visibilityState === "visible") {
        timeRef.current += delta;
        if (
          (runtime.disease.id === "afib" || runtime.disease.id === "vt") &&
          !runtime.reducedMotion
        ) {
          timeRef.current =
            (motionTelemetry.rhythmPosition * 60) /
            Math.max(28, runtime.simulation.heartRate);
        } else if (
          runtime.disease.id === "av-block" &&
          !runtime.reducedMotion
        ) {
          timeRef.current = motionTelemetry.elapsedSeconds;
        }
      }

      const amplitude = Math.min(64, height * 0.31);
      drawGrid(amplitude);
      if (runtime.compareHealthy) drawTrace(true, runtime);
      drawTrace(false, runtime);

      const scanX = width - 2;
      const glow = context.createLinearGradient(scanX - 24, 0, scanX, 0);
      glow.addColorStop(0, "rgba(82,230,188,0)");
      glow.addColorStop(1, "rgba(82,230,188,0.22)");
      context.fillStyle = glow;
      context.fillRect(scanX - 24, 0, 24, height);

      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      lastFrameRef.current = null;
    };
  }, [motionTelemetry]);

  return (
    <div className="ecg-module">
      <div className="ecg-toolbar">
        <div>
          <span className="eyebrow">ECG sintético · tiempo real</span>
          <h2>Trazo electrocardiográfico</h2>
        </div>
        <div className="lead-switcher" aria-label="Seleccionar derivación didáctica">
          {(["DII", "V2", "V5"] as Lead[]).map((item) => (
            <button
              key={item}
              type="button"
              className={lead === item ? "active" : ""}
              onClick={() => setLead(item)}
              aria-pressed={lead === item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="ecg-canvas-wrap">
        <canvas
          ref={canvasRef}
          aria-label={`ECG sintético en ${lead}: ${disease.ecgLesson}`}
        />
        <div className="ecg-calibration">
          <span>{lead}</span>
          <span>25 mm/s</span>
          <span>10 mm/mV</span>
        </div>
        {paused && <div className="ecg-paused">TRAZO PAUSADO</div>}
      </div>

      <div className="ecg-readouts" aria-label="Lecturas del ECG">
        <div>
          <span>Ritmo</span>
          <strong>
            {disease.id === "av-block"
              ? simulation.avBlockStage === 1
                ? "Sinusal · conducción 1:1"
                : simulation.avBlockStage === 2
                  ? "Wenckebach · conducción 4:3"
                  : simulation.avBlockStage === 3
                    ? "Mobitz II · conducción 3:2"
                    : "Disociación AV completa"
              : disease.rhythmLabel}
          </strong>
        </div>
        <div>
          <span>QRS</span>
          <strong>
            {disease.id === "av-block"
              ? simulation.avBlockStage <= 2
                ? "Conducido · estrecho"
                : simulation.avBlockStage === 3
                  ? "Conducido · 130 ms"
                  : "Escape · 150 ms"
              : disease.id === "infarction"
                ? simulation.infarction.stage === "hyperacute"
                  ? "R conservada · sin Q patológica"
                  : simulation.infarction.stage === "acute-injury"
                    ? "R decreciente · Q incipiente"
                    : simulation.infarction.stage === "evolving"
                      ? "Pérdida de R · Q emergente"
                      : "Q patológica / complejo QS"
              : disease.qrsLabel}
          </strong>
        </div>
        <div>
          <span>
            {disease.id === "afib"
              ? "Ondas P"
              : disease.id === "av-block"
                ? "Relación P–QRS"
                : "ST–T"}
          </span>
          <strong>
            {disease.id === "afib"
              ? "Ausentes · ondas f"
              : disease.id === "av-block"
                ? simulation.avBlockStage === 1
                  ? "PR fijo 240 ms"
                  : simulation.avBlockStage === 2
                    ? "PR 180 → 240 → 310 ms"
                    : simulation.avBlockStage === 3
                      ? "PR fijo 180 ms + bloqueos"
                      : "Sin relación fija"
                : disease.id === "infarction"
                  ? simulation.infarction.stage === "hyperacute"
                    ? "T hiperagudas · J incipiente"
                    : simulation.infarction.stage === "acute-injury"
                      ? "ST ↑ V2/V5 · DII recíproco"
                      : "ST ↑ persistente · T aún positiva"
                : disease.stLabel}
          </strong>
        </div>
      </div>

      <div className="look-card">
        <span className="look-number">01</span>
        <div>
          <strong>Qué debes mirar</strong>
          <p>{disease.ecgLesson}</p>
        </div>
      </div>
      <p className="ecg-disclaimer">
        Patrón representativo y simplificado. Una tira aislada no confirma ni descarta un diagnóstico.
      </p>
    </div>
  );
}
