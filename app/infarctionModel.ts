import type { EcgLead } from "./vtModel";

export type InfarctionStage =
  | "not-applicable"
  | "hyperacute"
  | "acute-injury"
  | "evolving"
  | "established-necrosis";

export type InfarctionProgression = {
  stage: InfarctionStage;
  stageLabel: string;
  occlusionFraction: number;
  occlusiveLoad: number;
  territoryFraction: number;
  hyperacuteT: number;
  stElevation: number;
  qWave: number;
  myocardialInjuryFraction: number;
  necrosisFraction: number;
  wallMotionLoss: number;
  regionalDyskinesia: number;
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

export const EMPTY_INFARCTION_PROGRESSION: InfarctionProgression = {
  stage: "not-applicable",
  stageLabel: "No aplicable",
  occlusionFraction: 0,
  occlusiveLoad: 0,
  territoryFraction: 0,
  hyperacuteT: 0,
  stElevation: 0,
  qWave: 0,
  myocardialInjuryFraction: 0,
  necrosisFraction: 0,
  wallMotionLoss: 0,
  regionalDyskinesia: 0,
};

export function deriveInfarctionProgression(
  occlusionPercent: number,
  elapsedMinutes: number,
  territoryPercent: number,
): InfarctionProgression {
  const occlusionFraction = clamp(occlusionPercent / 100);
  const occlusiveLoad = smoothStep(0.72, 0.98, occlusionFraction);
  const territoryFraction = 0.45 + clamp(territoryPercent / 100) * 0.55;
  const electricalExtent = occlusiveLoad * territoryFraction;
  const minutes = Math.max(0, elapsedMinutes);

  // Persistent LAD occlusion without simulated reperfusion. Hyperacute T waves
  // are transient; ST elevation persists while Q-wave/R-loss evolves later.
  const hyperacuteT = electricalExtent * (1 - smoothStep(8, 24, minutes));
  const stElevation = electricalExtent * smoothStep(3, 18, minutes);
  const qWave = electricalExtent * smoothStep(25, 90, minutes);
  const myocardialInjuryFraction =
    electricalExtent * smoothStep(1, 25, minutes);
  const necrosisFraction = electricalExtent * smoothStep(20, 90, minutes);

  // Regional motion deteriorates within minutes, before necrosis is complete.
  const wallMotionLoss = clamp(
    occlusiveLoad *
      (0.45 +
        smoothStep(1, 20, minutes) * 0.42 +
        necrosisFraction * 0.1),
    0,
    0.98,
  );
  const regionalDyskinesia =
    smoothStep(0.9, 0.98, wallMotionLoss) *
    smoothStep(0.55, 0.9, necrosisFraction) *
    0.16;

  const stage: InfarctionStage =
    minutes < 8
      ? "hyperacute"
      : minutes < 25
        ? "acute-injury"
        : minutes < 70
          ? "evolving"
          : "established-necrosis";
  const stageLabel =
    stage === "hyperacute"
      ? "Fase hiperaguda"
      : stage === "acute-injury"
        ? "Lesión aguda"
        : stage === "evolving"
          ? "Infarto en evolución"
          : "Necrosis establecida";

  return {
    stage,
    stageLabel,
    occlusionFraction,
    occlusiveLoad,
    territoryFraction,
    hyperacuteT,
    stElevation,
    qWave,
    myocardialInjuryFraction,
    necrosisFraction,
    wallMotionLoss,
    regionalDyskinesia,
  };
}

const LEAD_MORPHOLOGY: Record<
  EcgLead,
  {
    p: number;
    q: number;
    r: number;
    s: number;
    t: number;
    hyperacuteT: number;
    st: number;
    qWave: number;
    rLoss: number;
  }
> = {
  DII: {
    p: 0.13,
    q: -0.1,
    r: 1.03,
    s: -0.28,
    t: 0.27,
    hyperacuteT: 0.08,
    st: -0.16,
    qWave: 0,
    rLoss: 0,
  },
  V2: {
    p: 0.08,
    q: -0.045,
    r: 0.44,
    s: -0.72,
    t: 0.21,
    hyperacuteT: 0.78,
    st: 0.58,
    qWave: 0.58,
    rLoss: 0.88,
  },
  V5: {
    p: 0.1,
    q: -0.08,
    r: 1.08,
    s: -0.21,
    t: 0.31,
    hyperacuteT: 0.46,
    st: 0.31,
    qWave: 0.3,
    rLoss: 0.42,
  },
};

export function infarctionComplex(
  elapsedSeconds: number,
  lead: EcgLead,
  progression: InfarctionProgression,
) {
  const morphology = LEAD_MORPHOLOGY[lead];
  const p = morphology.p * gaussian(elapsedSeconds, 0.07, 0.022);
  const evolvingQ =
    morphology.q * gaussian(elapsedSeconds, 0.148, 0.006) -
    morphology.qWave *
      progression.qWave *
      gaussian(elapsedSeconds, 0.145, 0.015);
  const r =
    morphology.r *
    (1 - morphology.rLoss * progression.qWave) *
    gaussian(elapsedSeconds, 0.164, 0.008);
  const s = morphology.s * gaussian(elapsedSeconds, 0.184, 0.011);
  const baselineT = morphology.t * gaussian(elapsedSeconds, 0.39, 0.058);
  const hyperacuteT =
    morphology.hyperacuteT *
    progression.hyperacuteT *
    gaussian(elapsedSeconds, 0.37, 0.076);
  const stChange =
    morphology.st *
    progression.stElevation *
    plateau(elapsedSeconds, 0.214, 0.342, 0.009);

  return p + evolvingQ + r + s + baselineT + hyperacuteT + stChange;
}

export function infarctionEcgValue(
  time: number,
  heartRate: number,
  lead: EcgLead,
  progression: InfarctionProgression,
) {
  const period = 60 / Math.max(40, heartRate);
  const elapsed = ((time % period) + period) % period;
  return (
    infarctionComplex(elapsed, lead, progression) +
    infarctionComplex(elapsed + period, lead, progression)
  );
}
