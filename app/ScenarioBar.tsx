"use client";

import {
  Activity,
  Expand,
  Link2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  DISEASES,
  formatSpecific,
  type Disease,
} from "./simulation";
import {
  getDiseaseControlConfig,
  getScenarioLandmarks,
  type ScenarioMode,
} from "./scenario";

type ScenarioBarProps = {
  disease: Disease;
  specificValue: number;
  stageLabel: string;
  paused: boolean;
  compareHealthy: boolean;
  mode: ScenarioMode;
  shareStatus: string;
  fullscreenSupported: boolean;
  fullscreenActive: boolean;
  onDiseaseChange: (diseaseId: Disease["id"]) => void;
  onSpecificChange: (value: number) => void;
  onTogglePaused: () => void;
  onToggleComparison: () => void;
  onModeChange: (mode: ScenarioMode) => void;
  onShare: () => void;
  onToggleFullscreen: () => void;
  onReset: () => void;
};

export function ScenarioBar({
  disease,
  specificValue,
  stageLabel,
  paused,
  compareHealthy,
  mode,
  shareStatus,
  fullscreenSupported,
  fullscreenActive,
  onDiseaseChange,
  onSpecificChange,
  onTogglePaused,
  onToggleComparison,
  onModeChange,
  onShare,
  onToggleFullscreen,
  onReset,
}: ScenarioBarProps) {
  const config = getDiseaseControlConfig(disease);
  const landmarks = getScenarioLandmarks(disease);

  return (
    <section
      className="scenario-bar"
      style={{ "--disease-color": disease.color } as CSSProperties}
      aria-label="Control del escenario clínico"
    >
      <div className="scenario-primary-row">
        <label className="scenario-disease-select">
          <span>Escenario clínico</span>
          <select
            value={disease.id}
            onChange={(event) =>
              onDiseaseChange(event.target.value as Disease["id"])
            }
          >
            {DISEASES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="scenario-stage" aria-live="polite">
          <span>Lectura actual</span>
          <strong>{stageLabel}</strong>
        </div>

        <div className="scenario-mode-switch" aria-label="Modo de uso">
          <button
            type="button"
            className={mode === "explore" ? "active" : ""}
            aria-pressed={mode === "explore"}
            onClick={() => onModeChange("explore")}
          >
            Explorar
          </button>
          <button
            type="button"
            className={mode === "guided" ? "active" : ""}
            aria-pressed={mode === "guided"}
            onClick={() => onModeChange("guided")}
          >
            Clase guiada
          </button>
        </div>
      </div>

      {disease.id !== "healthy" && (
        <div className="scenario-control-row">
          <div className="adaptive-control">
            <div className="adaptive-control-heading">
              <span>{disease.specific.label}</span>
              <strong>{formatSpecific(disease, specificValue)}</strong>
            </div>

            {config.kind === "discrete" ? (
              <div className="discrete-control" role="radiogroup" aria-label={disease.specific.label}>
                {config.options?.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={specificValue === option.value}
                    className={specificValue === option.value ? "active" : ""}
                    title={option.label}
                    onClick={() => onSpecificChange(option.value)}
                  >
                    {option.shortLabel}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input
                  type="range"
                  min={disease.specific.min}
                  max={disease.specific.max}
                  step={disease.specific.step}
                  value={specificValue}
                  onChange={(event) => onSpecificChange(Number(event.target.value))}
                  aria-label={`${disease.specific.label}: ${formatSpecific(disease, specificValue)}`}
                />
                <div className="adaptive-landmarks">
                  {landmarks.map((landmark) => (
                    <button
                      type="button"
                      key={`${landmark.label}-${landmark.value}`}
                      onClick={() => onSpecificChange(landmark.value)}
                    >
                      <span>{landmark.label}</span>
                      <strong>{formatSpecific(disease, landmark.value)}</strong>
                    </button>
                  ))}
                </div>
              </>
            )}
            {config.note && <small className="adaptive-note">{config.note}</small>}
          </div>

          <div className="scenario-actions">
            <button type="button" onClick={onTogglePaused} aria-pressed={paused}>
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? "Reanudar" : "Pausar"}
            </button>
            <button
              type="button"
              className={compareHealthy ? "active" : ""}
              onClick={onToggleComparison}
              aria-pressed={compareHealthy}
            >
              <Activity size={16} />
              {compareHealthy ? "Ocultar sano" : "Comparar sano"}
            </button>
            <button
              type="button"
              onClick={onShare}
              aria-label="Compartir escenario"
              aria-live="polite"
            >
              <Link2 size={16} />
              {shareStatus || "Compartir"}
            </button>
            {fullscreenSupported && (
              <button
                type="button"
                className={fullscreenActive ? "active" : ""}
                onClick={onToggleFullscreen}
                aria-pressed={fullscreenActive}
              >
                <Expand size={16} />
                {fullscreenActive ? "Salir" : "Presentar"}
              </button>
            )}
            <button type="button" onClick={onReset} aria-label="Restablecer simulación">
              <RotateCcw size={16} />
              Restablecer
            </button>
          </div>
        </div>
      )}

      {disease.id === "healthy" && (
        <div className="healthy-scenario-row">
          <p>Referencia fisiológica para comparar ritmo, conducción y contracción.</p>
          <div className="scenario-actions">
            <button type="button" onClick={onTogglePaused} aria-pressed={paused}>
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? "Reanudar" : "Pausar"}
            </button>
            <button
              type="button"
              onClick={onShare}
              aria-label="Compartir escenario"
              aria-live="polite"
            >
              <Link2 size={16} />
              {shareStatus || "Compartir"}
            </button>
            {fullscreenSupported && (
              <button
                type="button"
                className={fullscreenActive ? "active" : ""}
                onClick={onToggleFullscreen}
                aria-pressed={fullscreenActive}
              >
                <Expand size={16} />
                {fullscreenActive ? "Salir" : "Presentar"}
              </button>
            )}
            <button type="button" onClick={onReset} aria-label="Restablecer simulación">
              <RotateCcw size={16} />
              Restablecer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
