export type EcgLead = "DII" | "V2" | "V5";

export type AorticStenosisStage =
  | "mild"
  | "moderate"
  | "severe-high-gradient"
  | "very-severe-high-gradient";

export type AorticStenosisProgression = {
  stage: AorticStenosisStage;
  stageLabel: string;
  valveArea: number;
  obstructionFraction: number;
  valveOpeningFraction: number;
  peakVelocity: number;
  peakGradient: number;
  meanGradient: number;
  ejectionTime: number;
  strokeVolume: number;
  strokeVolumeIndex: number;
  flowState: "normal" | "low";
  ejectionFraction: number;
  contractility: number;
  lvSystolicPressure: number;
  concentricHypertrophy: number;
  longitudinalShorteningLoss: number;
  jetTurbulence: number;
  ecgRemodeling: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const EMPTY_AORTIC_STENOSIS_PROGRESSION: AorticStenosisProgression = {
  stage: "mild",
  stageLabel: "Estenosis aórtica leve",
  valveArea: 1.8,
  obstructionFraction: 0,
  valveOpeningFraction: 0.82,
  peakVelocity: 2.5,
  peakGradient: 25,
  meanGradient: 16,
  ejectionTime: 0.31,
  strokeVolume: 72,
  strokeVolumeIndex: 40,
  flowState: "normal",
  ejectionFraction: 66,
  contractility: 1,
  lvSystolicPressure: 134,
  concentricHypertrophy: 0,
  longitudinalShorteningLoss: 0,
  jetTurbulence: 0,
  ecgRemodeling: 0,
};

/**
 * Didactic phenotype: calcific AS in sinus rhythm, initially preserved LVEF,
 * and normal transvalvular flow at ordinary heart rates. The haemodynamic
 * measurements remain flow-dependent, so extreme tachycardia can move the
 * model into a low-flow state instead of falsely preserving a high gradient.
 */
export function deriveAorticStenosisProgression(
  selectedValveArea: number,
  remodelingPercent: number,
  elapsedYears: number,
  heartRate = 72,
  systolicBloodPressure = 118,
): AorticStenosisProgression {
  const valveArea = clamp(selectedValveArea, 0.7, 1.8);
  const obstructionFraction = clamp((1.8 - valveArea) / 1.1);
  const pressureLoad = clamp((systolicBloodPressure - 120) / 70);
  const timeExposure = clamp(elapsedYears / 12);
  const remodelingExposure = clamp(
    clamp(remodelingPercent / 100) * 0.52 +
      timeExposure * 0.18 +
      obstructionFraction * 0.36 +
      pressureLoad * 0.16,
  );

  const concentricHypertrophy = clamp(
    remodelingExposure * 0.9,
    0,
    0.9,
  );
  const longitudinalShorteningLoss = clamp(
    0.04 +
      concentricHypertrophy * 0.3 +
      obstructionFraction * 0.08,
    0.04,
    0.38,
  );

  const tachycardiaFillingLoss = Math.max(0, heartRate - 90) * 0.11;
  const strokeVolume = clamp(
    74 -
      obstructionFraction * 3.2 -
      concentricHypertrophy * 3.4 -
      tachycardiaFillingLoss,
    52,
    78,
  );
  const assumedBodySurfaceArea = 1.8;
  const strokeVolumeIndex = strokeVolume / assumedBodySurfaceArea;
  const flowState = strokeVolumeIndex >= 35 ? "normal" : "low";

  const ejectionTime = clamp(
    0.31 +
      obstructionFraction * 0.045 -
      Math.max(0, heartRate - 90) * 0.00045,
    0.25,
    0.365,
  );

  // Peak velocity is derived from systolic flow rate / effective orifice area.
  // 1.95 approximates the peak-to-mean systolic flow ratio for this waveform.
  const peakVelocity = clamp(
    ((strokeVolume / ejectionTime / valveArea) * 0.01) * 1.95,
    2,
    6.2,
  );
  const peakGradient = 4 * peakVelocity ** 2;
  // A calibrated waveform mean; unlike the peak gradient, it is not claimed
  // to be a second application of the simplified Bernoulli equation.
  const meanGradient = 2.5 * peakVelocity ** 2;

  let stage: AorticStenosisStage = "mild";
  let stageLabel = "Estenosis aórtica leve";
  if (peakVelocity >= 5 || meanGradient >= 60) {
    stage = "very-severe-high-gradient";
    stageLabel = "Muy severa · gradiente alto";
  } else if (
    valveArea <= 1 &&
    (peakVelocity >= 4 || meanGradient >= 40)
  ) {
    stage = "severe-high-gradient";
    stageLabel = "Severa · gradiente alto";
  } else if (
    valveArea <= 1.5 ||
    peakVelocity >= 3 ||
    meanGradient >= 20
  ) {
    stage = "moderate";
    stageLabel =
      valveArea <= 1 && peakVelocity < 4 && meanGradient < 40
        ? "Moderada-alta · parámetros limítrofes"
        : "Estenosis aórtica moderada";
  }

  const ejectionFraction = clamp(
    66 - concentricHypertrophy * 2.8 - obstructionFraction * 1.5,
    58,
    67,
  );
  const contractility = clamp(
    1.01 - longitudinalShorteningLoss * 0.11,
    0.95,
    1.01,
  );
  const lvSystolicPressure =
    systolicBloodPressure + meanGradient;
  const valveOpeningFraction = clamp(valveArea / 2.2, 0.28, 0.82);
  const jetTurbulence = clamp(
    obstructionFraction * 0.72 +
      clamp((peakVelocity - 2.5) / 2.5) * 0.28,
  );
  const ecgRemodeling = clamp(
    concentricHypertrophy * 0.88 +
      timeExposure * 0.08,
  );

  return {
    stage,
    stageLabel,
    valveArea,
    obstructionFraction,
    valveOpeningFraction,
    peakVelocity,
    peakGradient,
    meanGradient,
    ejectionTime,
    strokeVolume,
    strokeVolumeIndex,
    flowState,
    ejectionFraction,
    contractility,
    lvSystolicPressure,
    concentricHypertrophy,
    longitudinalShorteningLoss,
    jetTurbulence,
    ecgRemodeling,
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
 * Sinus ECG with a remodeling-dependent LVH/strain phenotype. It deliberately
 * does not encode valve area, velocity, or gradient: the ECG can support LVH
 * but cannot grade aortic stenosis.
 */
export function aorticStenosisEcgValue(
  time: number,
  heartRate: number,
  lead: EcgLead,
  remodelingFraction: number,
) {
  const rate = clamp(heartRate, 28, 220);
  const phase = ((time / (60 / rate)) % 1 + 1) % 1;
  const remodeling = clamp(remodelingFraction);
  const strain = clamp((remodeling - 0.34) / 0.66);
  const p = 0.13 * gaussian(phase, 0.15, 0.026);

  if (lead === "V2") {
    const qrs =
      -0.04 * gaussian(phase, 0.288, 0.01) +
      (0.42 - remodeling * 0.08) * gaussian(phase, 0.31, 0.009) -
      (0.72 + remodeling * 0.72) * gaussian(phase, 0.342, 0.015);
    const discordantSt =
      0.08 * strain * plateau(phase, 0.365, 0.47, 0.014);
    const t = (0.2 + remodeling * 0.03) * gaussian(phase, 0.59, 0.065);
    return p * 0.86 + qrs + discordantSt + t;
  }

  if (lead === "V5") {
    const qrs =
      -0.08 * gaussian(phase, 0.288, 0.011) +
      (1.06 + remodeling * 0.82) * gaussian(phase, 0.31, 0.01) -
      0.16 * gaussian(phase, 0.34, 0.013);
    const stDepression =
      -0.18 * strain * plateau(phase, 0.365, 0.49, 0.016);
    const t =
      (0.31 - strain * 0.72) * gaussian(phase, 0.59, 0.072);
    return p + qrs + stDepression + t;
  }

  const qrs =
    -0.11 * gaussian(phase, 0.288, 0.012) +
    (1.02 + remodeling * 0.26) * gaussian(phase, 0.31, 0.01) -
    0.28 * gaussian(phase, 0.338, 0.014);
  const stDepression =
    -0.06 * strain * plateau(phase, 0.37, 0.48, 0.016);
  const t =
    (0.3 - strain * 0.18) * gaussian(phase, 0.59, 0.068);
  return p + qrs + stDepression + t;
}
