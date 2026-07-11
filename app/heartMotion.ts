import type { DiseaseId } from "./simulation";

export type CardiacStage = "atria" | "ventricles" | "filling";

export type HeartMotionTelemetry = {
  phase: number;
  elapsedSeconds: number;
  rhythmPosition: number;
  beatIndex: number;
  rrIntervalMs: number;
  atrialRate: number;
  avBlockStage: number;
  avConductionProgress: number;
  avDropped: boolean;
  ventricularEscape: boolean;
  ventricularStrength: number;
  atrial: number;
  ventricular: number;
  filling: number;
  skipped: boolean;
  stage: CardiacStage;
};

type MotionInput = {
  phase: number;
  beatIndex: number;
  diseaseId: DiseaseId;
  severity: number;
  contractility: number;
  ventricularStrength?: number;
  atrialPhase?: number;
  ventricularSuppressed?: boolean;
};

export type CardiacMotion = HeartMotionTelemetry & {
  atrialFlutter: number;
  dyssynchrony: number;
  regionalDysfunction: number;
  regionalDelay: number;
  twist: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothStep = (start: number, end: number, value: number) => {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
};

const cyclicPulse = (phase: number, center: number, halfWidth: number) => {
  const wrappedDistance = Math.abs(
    ((((phase - center) % 1) + 1.5) % 1) - 0.5,
  );
  return smoothStep(0, 1, 1 - wrappedDistance / halfWidth);
};

export const createHeartMotionTelemetry = (): HeartMotionTelemetry => ({
  phase: 0,
  elapsedSeconds: 0,
  rhythmPosition: 0,
  beatIndex: 0,
  rrIntervalMs: 0,
  atrialRate: 0,
  avBlockStage: 1,
  avConductionProgress: 0,
  avDropped: false,
  ventricularEscape: false,
  ventricularStrength: 1,
  atrial: 0,
  ventricular: 0,
  filling: 1,
  skipped: false,
  stage: "filling",
});

export function computeCardiacMotion({
  phase,
  beatIndex,
  diseaseId,
  severity,
  contractility,
  ventricularStrength = 1,
  atrialPhase,
  ventricularSuppressed,
}: MotionInput): CardiacMotion {
  const normalizedPhase = ((phase % 1) + 1) % 1;
  const normalizedSeverity = clamp(severity);
  const ischemicBurden = smoothStep(0.18, 0.82, normalizedSeverity);

  const skipped =
    diseaseId === "av-block" &&
    (ventricularSuppressed ??
      beatIndex % (normalizedSeverity > 0.68 ? 3 : 2) !== 0);

  const ventricularRise = smoothStep(0.025, 0.13, normalizedPhase);
  const ventricularRelaxation =
    1 - smoothStep(0.42, 0.64, normalizedPhase);
  const coordinatedVentricular = ventricularRise * ventricularRelaxation;
  const ventricular = skipped
    ? 0
    : coordinatedVentricular * clamp(ventricularStrength, 0.7, 1.18);

  const normalizedAtrialPhase =
    atrialPhase === undefined
      ? normalizedPhase
      : ((atrialPhase % 1) + 1) % 1;
  const coordinatedAtrial = Math.pow(
    cyclicPulse(normalizedAtrialPhase, 0.86, 0.145),
    1.22,
  );
  const atrial = diseaseId === "afib" ? 0 : coordinatedAtrial;

  const filling = clamp(1 - Math.max(ventricular, atrial) * 0.92);
  const stage: CardiacStage =
    atrial > 0.24
      ? "atria"
      : ventricular > 0.16
        ? "ventricles"
        : "filling";

  return {
    phase: normalizedPhase,
    elapsedSeconds: 0,
    rhythmPosition: normalizedPhase,
    beatIndex,
    rrIntervalMs: 0,
    atrialRate: 0,
    avBlockStage: 1,
    avConductionProgress: 0,
    avDropped: false,
    ventricularEscape: false,
    ventricularStrength,
    atrial,
    ventricular,
    filling,
    skipped,
    stage,
    atrialFlutter: diseaseId === "afib" ? 0.58 : 0,
    dyssynchrony:
      diseaseId === "vt" ? 0.18 + normalizedSeverity * 0.82 : 0,
    regionalDysfunction:
      diseaseId === "infarction"
        ? 0.42 + normalizedSeverity * 0.55
        : diseaseId === "ischemia"
          ? ischemicBurden * 0.68
          : 0,
    regionalDelay: diseaseId === "ischemia" ? ischemicBurden * 0.085 : 0,
    twist:
      (0.045 + clamp(contractility, 0.18, 1.08) * 0.095) *
      (diseaseId === "hcm" ? 1.16 : 1),
  };
}
