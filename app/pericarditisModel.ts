export type EcgLead = "DII" | "V2" | "V5";

export type PericarditisEcgStage =
  | "stage-i-injury"
  | "stage-ii-normalizing"
  | "stage-iii-t-inversion"
  | "stage-iv-recovery";

export type PericarditisProgression = {
  stage: PericarditisEcgStage;
  stageLabel: string;
  elapsedDays: number;
  inflammationFraction: number;
  typicalEcgExpression: number;
  prDepression: number;
  stElevation: number;
  tWaveScale: number;
  tInversion: number;
  pericardialVisibility: number;
  effusionFraction: number;
  myocardialRestriction: number;
  contractility: number;
  ejectionFraction: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const EMPTY_PERICARDITIS_PROGRESSION: PericarditisProgression = {
  stage: "stage-i-injury",
  stageLabel: "Fase I · lesión pericárdica",
  elapsedDays: 0,
  inflammationFraction: 0,
  typicalEcgExpression: 0,
  prDepression: 0,
  stElevation: 0,
  tWaveScale: 1,
  tInversion: 0,
  pericardialVisibility: 0,
  effusionFraction: 0,
  myocardialRestriction: 0,
  contractility: 1,
  ejectionFraction: 64,
};

/**
 * Didactic phenotype: uncomplicated acute idiopathic/viral pericarditis,
 * without myocarditis, significant effusion, tamponade or constriction.
 * The ECG evolves by the classic four-stage sequence, which is illustrative
 * rather than universal; its expression is intentionally adjustable.
 */
export function derivePericarditisProgression(
  inflammationPercent: number,
  typicalEcgExpressionPercent: number,
  elapsedDays: number,
): PericarditisProgression {
  const days = Math.max(0, elapsedDays);
  const initialInflammation = clamp(inflammationPercent / 100);
  const typicalEcgExpression = clamp(typicalEcgExpressionPercent / 100);

  // Inflammation is most visible in the first week and then resolves over a
  // representative several-week course. No fluid is inferred from it.
  const resolution =
    days <= 7 ? 1 : clamp(1 - ((days - 7) / 35) * 0.82, 0.18, 1);
  const inflammationFraction = initialInflammation * resolution;

  let stage: PericarditisEcgStage;
  let stageLabel: string;
  let prDepression = 0;
  let stElevation = 0;
  let tWaveScale = 1;
  let tInversion = 0;

  if (days < 4) {
    stage = "stage-i-injury";
    stageLabel = "Fase I · ST difuso y PR descendido";
    prDepression = typicalEcgExpression * inflammationFraction;
    stElevation = typicalEcgExpression * inflammationFraction;
  } else if (days < 7) {
    stage = "stage-ii-normalizing";
    stageLabel = "Fase II · ST–PR hacia la línea basal";
    const normalization = clamp((7 - days) / 3);
    prDepression = typicalEcgExpression * inflammationFraction * normalization * 0.22;
    stElevation = typicalEcgExpression * inflammationFraction * normalization * 0.22;
    tWaveScale = 1 - typicalEcgExpression * (1 - normalization);
  } else if (days < 21) {
    stage = "stage-iii-t-inversion";
    stageLabel = "Fase III · inversión difusa de T";
    const onset = 0.75 + clamp((days - 7) / 4) * 0.25;
    const lateFade = clamp((21 - days) / 7, 0.35, 1);
    tWaveScale = 1 - typicalEcgExpression;
    tInversion = typicalEcgExpression * onset * lateFade;
  } else {
    stage = "stage-iv-recovery";
    stageLabel = "Fase IV · recuperación de la onda T";
    const recovery = clamp((days - 21) / 21);
    tWaveScale = 1 - typicalEcgExpression * (1 - recovery);
    tInversion = typicalEcgExpression * (1 - recovery) * 0.38;
  }

  return {
    stage,
    stageLabel,
    elapsedDays: days,
    inflammationFraction,
    typicalEcgExpression,
    prDepression,
    stElevation,
    tWaveScale,
    tInversion,
    pericardialVisibility: clamp(0.18 + inflammationFraction * 0.82),
    // This phenotype explicitly excludes effusion with haemodynamic impact.
    effusionFraction: 0,
    myocardialRestriction: 0,
    contractility: 1,
    ejectionFraction: 64,
  };
}

const gaussian = (x: number, center: number, width: number) => {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
};

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const plateau = (x: number, start: number, end: number, edge = 0.012) =>
  sigmoid((x - start) / edge) - sigmoid((x - end) / edge);

/**
 * Sinus ECG with the classic temporal sequence: stage-I diffuse concave ST
 * elevation plus PR depression, normalization/flattening, then T inversion
 * only after the ST segment has returned to baseline. DII, V2 and V5 are all
 * non-aVR/non-V1 leads, so the stage-I change remains concordantly diffuse.
 */
export function pericarditisEcgValue(
  time: number,
  heartRate: number,
  lead: EcgLead,
  progression: PericarditisProgression,
) {
  const rate = clamp(heartRate, 28, 220);
  const phase = ((time / (60 / rate)) % 1 + 1) % 1;
  const leadScale = lead === "V2" ? 0.88 : lead === "V5" ? 1.05 : 1;

  const pAmplitude = lead === "V2" ? 0.1 : 0.13;
  const p = pAmplitude * gaussian(phase, 0.15, 0.026);
  const qrs =
    (lead === "V2" ? -0.05 : -0.12) * gaussian(phase, 0.288, 0.011) +
    (lead === "V2" ? 0.5 : lead === "V5" ? 1.14 : 1.08) *
      gaussian(phase, 0.31, 0.009) -
    (lead === "V2" ? 0.72 : lead === "V5" ? 0.18 : 0.32) *
      gaussian(phase, 0.338, 0.013);

  const prSegment =
    -0.12 * progression.prDepression * leadScale *
    plateau(phase, 0.185, 0.27, 0.011);
  // A broad plateau with a smooth mid-segment crown produces the expected
  // upward-concave, non-territorial ST shape without reciprocal depression.
  const stSegment =
    progression.stElevation * leadScale *
    (0.25 * plateau(phase, 0.355, 0.515, 0.025) +
      0.08 * gaussian(phase, 0.49, 0.09));

  const normalT = 0.33 * progression.tWaveScale *
    gaussian(phase, 0.59, 0.065);
  const invertedT =
    -0.42 * progression.tInversion * leadScale *
    gaussian(phase, 0.59, 0.07);

  return p + qrs + prSegment + stSegment + normalT + invertedT;
}
