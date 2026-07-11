"use client";

import { ArrowLeft, ArrowRight, Check, Eye, SlidersHorizontal } from "lucide-react";
import type { CSSProperties } from "react";
import { formatSpecific, type Disease, type DerivedSimulation } from "./simulation";
import { getScenarioLandmarks, type GuidedStep } from "./scenario";

type GuidedLessonProps = {
  disease: Disease;
  simulation: DerivedSimulation;
  step: GuidedStep;
  onStepChange: (step: GuidedStep) => void;
  onSpecificChange: (value: number) => void;
};

const STEP_META = [
  { step: 1 as const, label: "Observa", icon: Eye },
  { step: 2 as const, label: "Modifica", icon: SlidersHorizontal },
  { step: 3 as const, label: "Interpreta", icon: Check },
];

export function GuidedLesson({
  disease,
  simulation,
  step,
  onStepChange,
  onSpecificChange,
}: GuidedLessonProps) {
  const landmarks = getScenarioLandmarks(disease);

  return (
    <section
      className="guided-lesson"
      style={{ "--disease-color": disease.color } as CSSProperties}
      aria-labelledby="guided-title"
    >
      <div className="guided-progress" aria-label={`Paso ${step} de 3`}>
        {STEP_META.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.step}
              type="button"
              className={step === item.step ? "active" : step > item.step ? "complete" : ""}
              aria-current={step === item.step ? "step" : undefined}
              onClick={() => onStepChange(item.step)}
            >
              <Icon size={15} />
              <span>{item.step}. {item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="guided-content" aria-live="polite">
        {step === 1 && (
          <div>
            <span className="eyebrow">Paso 1 · Observa</span>
            <h2 id="guided-title">Localiza qué cambia en el corazón</h2>
            <p>{disease.heartLesson}</p>
            <strong className="guided-focus">Zona de atención: {disease.regionLabel}</strong>
          </div>
        )}

        {step === 2 && (
          <div>
            <span className="eyebrow">Paso 2 · Modifica</span>
            <h2 id="guided-title">Cambia una sola variable y mira la respuesta</h2>
            <p>
              Mantén las constantes y compara cómo cambia el movimiento, el ECG y la
              hemodinámica al recorrer tres puntos del modelo.
            </p>
            {disease.id === "healthy" ? (
              <strong className="guided-focus">Selecciona una cardiopatía para experimentar.</strong>
            ) : (
              <div className="guided-presets">
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
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <span className="eyebrow">Paso 3 · Interpreta</span>
            <h2 id="guided-title">Conecta anatomía, ECG y función</h2>
            <div className="guided-interpretation-grid">
              <article>
                <span>Movimiento</span>
                <p>{disease.heartLesson}</p>
              </article>
              <article>
                <span>ECG</span>
                <p>{disease.ecgLesson}</p>
              </article>
              <article>
                <span>Hemodinámica actual</span>
                <p>
                  FC {simulation.heartRate} lpm · FE {Math.round(simulation.ejectionFraction)}% ·
                  gasto {simulation.cardiacOutput.toFixed(1)} L/min.
                </p>
              </article>
              <article className="guided-caution">
                <span>Límite clínico</span>
                <p>{disease.caveat}</p>
              </article>
            </div>
          </div>
        )}
      </div>

      <div className="guided-navigation">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => onStepChange((step - 1) as GuidedStep)}
        >
          <ArrowLeft size={15} /> Anterior
        </button>
        <span>Paso {step} de 3</span>
        <button
          type="button"
          disabled={step === 3}
          onClick={() => onStepChange((step + 1) as GuidedStep)}
        >
          Siguiente <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

