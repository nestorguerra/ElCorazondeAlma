import type { EcgLead } from "./vtModel";

export type HeartFailureStage =
  | "not-applicable"
  | "moderate-systolic-dysfunction"
  | "advanced-remodeling"
  | "severe-systolic-dysfunction";

export type HeartFailureProgression = {
  stage: HeartFailureStage;
  stageLabel: string;
  ejectionFraction: number;
  dilationFraction: number;
  globalSystolicLoss: number;
  contractility: number;
  endDiastolicVolume: number;
  endSystolicVolume: number;
  strokeVolume: number;
  residualVolumeFraction: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothStep = (start: number, end: number, value: number) => {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
};

const gaussian = (x: number, center: number, width: number) => {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
};

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const plateau = (x: number, start: number, end: number, edge = 0.008) =>
  sigmoid((x - start) / edge) - sigmoid((x - end) / edge);

export const EMPTY_HEART_FAILURE_PROGRESSION: HeartFailureProgression = {
  stage: "not-applicable",
  stageLabel: "No aplicable",
  ejectionFraction: 60,
  dilationFraction: 0,
  globalSystolicLoss: 0,
  contractility: 1,
  endDiastolicVolume: 120,
  endSystolicVolume: 48,
  strokeVolume: 72,
  residualVolumeFraction: 0.4,
};

/**
 * Didactic dilated-HFrEF phenotype. Volumes are internally constrained by
 * LVEF = (LVEDV - LVESV) / LVEDV, rather than estimated independently.
 */
export function deriveHeartFailureProgression(
  selectedEjectionFraction: number,
  remodelingPercent: number,
  elapsedMonths: number,
  afterloadBurden = 0,
  heartRate = 72,
): HeartFailureProgression {
  const remodeling = clamp(remodelingPercent / 100);
  const chronicProgress = smoothStep(0, 36, Math.max(0, elapsedMonths));
  const ejectionFraction = clamp(
    selectedEjectionFraction -
      chronicProgress * (1 + remodeling * 2) -
      clamp(afterloadBurden) * 3,
    15,
    40,
  );
  const systolicDeficit = clamp((40 - ejectionFraction) / 25);
  const dilationFraction = clamp(
    0.18 + remodeling * 0.5 + systolicDeficit * 0.2 + chronicProgress * 0.12,
  );
  const rateFillingFraction = clamp(
    1 - Math.max(0, heartRate - 100) / 220,
    0.65,
    1,
  );
  const endDiastolicVolume = (120 + dilationFraction * 90) * rateFillingFraction;
  const strokeVolume = endDiastolicVolume * (ejectionFraction / 100);
  const endSystolicVolume = endDiastolicVolume - strokeVolume;
  const residualVolumeFraction = endSystolicVolume / endDiastolicVolume;
  const globalSystolicLoss = clamp(1 - ejectionFraction / 58, 0.28, 0.78);
  const contractility = clamp(ejectionFraction / 55, 0.28, 0.8);

  const stage: HeartFailureStage =
    ejectionFraction <= 20 || endSystolicVolume >= 150
      ? "severe-systolic-dysfunction"
      : dilationFraction >= 0.68 || ejectionFraction <= 30
        ? "advanced-remodeling"
        : "moderate-systolic-dysfunction";
  const stageLabel =
    stage === "severe-systolic-dysfunction"
      ? "Disfunción sistólica grave"
      : stage === "advanced-remodeling"
        ? "Remodelado dilatado avanzado"
        : "Disfunción sistólica moderada";

  return {
    stage,
    stageLabel,
    ejectionFraction,
    dilationFraction,
    globalSystolicLoss,
    contractility,
    endDiastolicVolume,
    endSystolicVolume,
    strokeVolume,
    residualVolumeFraction,
  };
}

const MORPHOLOGY: Record<
  EcgLead,
  { p: number; q: number; r: number; s: number; t: number; st: number }
> = {
  DII: { p: 0.13, q: -0.1, r: 1.02, s: -0.28, t: 0.25, st: 0 },
  V2: { p: 0.075, q: -0.04, r: 0.28, s: -0.76, t: 0.16, st: 0 },
  V5: { p: 0.09, q: -0.08, r: 1.1, s: -0.2, t: 0.18, st: -0.035 },
};

/**
 * Narrow-QRS sinus phenotype with poor precordial R progression and subtle,
 * nonspecific lateral repolarization change. It deliberately does not vary
 * with LVEF because the ECG cannot measure ejection fraction.
 */
export function heartFailureComplex(elapsedSeconds: number, lead: EcgLead) {
  const morphology = MORPHOLOGY[lead];
  return (
    morphology.p * gaussian(elapsedSeconds, 0.07, 0.022) +
    morphology.q * gaussian(elapsedSeconds, 0.148, 0.006) +
    morphology.r * gaussian(elapsedSeconds, 0.164, 0.008) +
    morphology.s * gaussian(elapsedSeconds, 0.184, 0.011) +
    morphology.st * plateau(elapsedSeconds, 0.218, 0.315, 0.008) +
    morphology.t * gaussian(elapsedSeconds, 0.39, 0.06)
  );
}

export function heartFailureEcgValue(
  time: number,
  heartRate: number,
  lead: EcgLead,
) {
  const period = 60 / Math.max(40, heartRate);
  const elapsed = ((time % period) + period) % period;
  return (
    heartFailureComplex(elapsed, lead) +
    heartFailureComplex(elapsed + period, lead)
  );
}
