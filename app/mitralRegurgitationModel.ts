export type EcgLead = "DII" | "V2" | "V5";

export type MitralRegurgitationStage =
  | "mild"
  | "moderate"
  | "moderate-high"
  | "severe";

export type MitralRegurgitationProgression = {
  stage: MitralRegurgitationStage;
  stageLabel: string;
  regurgitantFraction: number;
  totalStrokeVolume: number;
  regurgitantVolume: number;
  forwardStrokeVolume: number;
  effectiveRegurgitantOrificeArea: number;
  regurgitantJetVelocity: number;
  endDiastolicVolume: number;
  endSystolicVolume: number;
  ejectionFraction: number;
  contractility: number;
  leftVentricularDilation: number;
  leftAtrialDilation: number;
  coaptationGapFraction: number;
  pulmonaryVenousFlow: "normal" | "blunted" | "systolic-reversal";
  estimatedLeftAtrialPressure: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const EMPTY_MITRAL_REGURGITATION_PROGRESSION: MitralRegurgitationProgression = {
  stage: "mild",
  stageLabel: "Insuficiencia mitral leve",
  regurgitantFraction: 0.1,
  totalStrokeVolume: 84,
  regurgitantVolume: 8,
  forwardStrokeVolume: 76,
  effectiveRegurgitantOrificeArea: 0.06,
  regurgitantJetVelocity: 5,
  endDiastolicVolume: 130,
  endSystolicVolume: 46,
  ejectionFraction: 65,
  contractility: 1,
  leftVentricularDilation: 0.07,
  leftAtrialDilation: 0.08,
  coaptationGapFraction: 0.08,
  pulmonaryVenousFlow: "normal",
  estimatedLeftAtrialPressure: 10,
};

/**
 * Didactic phenotype: chronic primary degenerative MR with sinus rhythm and a
 * compensated LV. LVEF describes total LV emptying, while forward stroke
 * volume excludes the blood returning to the LA.
 */
export function deriveMitralRegurgitationProgression(
  selectedRegurgitantFractionPercent: number,
  remodelingPercent: number,
  elapsedYears: number,
  heartRate = 72,
  systolicBloodPressure = 118,
): MitralRegurgitationProgression {
  const regurgitantFraction =
    clamp(selectedRegurgitantFractionPercent, 10, 60) / 100;
  const timeExposure = clamp(elapsedYears / 12);
  const pressureLoad = clamp((systolicBloodPressure - 120) / 70);
  const remodelingExposure = clamp(
    clamp(remodelingPercent / 100) * 0.5 +
      timeExposure * 0.2 +
      regurgitantFraction * 0.42 +
      pressureLoad * 0.12,
  );

  const tachycardiaPenalty = Math.max(0, heartRate - 100) * 0.08;
  const afterloadPenalty = pressureLoad * 5;
  const targetForwardStrokeVolume = clamp(
    72 - tachycardiaPenalty - afterloadPenalty,
    52,
    76,
  );
  const totalStrokeVolume = clamp(
    targetForwardStrokeVolume / (1 - regurgitantFraction),
    80,
    180,
  );
  const regurgitantVolume = totalStrokeVolume * regurgitantFraction;
  const forwardStrokeVolume = totalStrokeVolume - regurgitantVolume;

  // A representative holosystolic MR VTI of 150 cm keeps RF, RVol and EROA
  // mutually consistent without implying that jet velocity grades severity.
  const effectiveRegurgitantOrificeArea = regurgitantVolume / 150;
  const estimatedLeftAtrialPressure = clamp(
    8 +
      regurgitantFraction * 18 +
      remodelingExposure * 4 -
      timeExposure * 1.5,
    8,
    24,
  );
  const lvLaPressureDifference = Math.max(
    64,
    systolicBloodPressure - estimatedLeftAtrialPressure,
  );
  const regurgitantJetVelocity = clamp(
    Math.sqrt(lvLaPressureDifference / 4),
    4,
    6,
  );

  const ejectionFraction = clamp(
    64 + regurgitantFraction * 8 - remodelingExposure * 3.2,
    60,
    70,
  );
  const endDiastolicVolume = totalStrokeVolume / (ejectionFraction / 100);
  const endSystolicVolume = endDiastolicVolume - totalStrokeVolume;
  const leftVentricularDilation = clamp((endDiastolicVolume - 120) / 145);
  const leftAtrialDilation = clamp(
    regurgitantFraction * 0.58 + remodelingExposure * 0.62,
  );
  const contractility = clamp(
    1.035 - remodelingExposure * 0.045,
    0.99,
    1.035,
  );
  const coaptationGapFraction = clamp(
    (regurgitantFraction - 0.05) / 0.55,
  );

  let stage: MitralRegurgitationStage = "mild";
  let stageLabel = "Insuficiencia mitral leve";
  if (
    regurgitantFraction >= 0.5 &&
    regurgitantVolume >= 60 &&
    effectiveRegurgitantOrificeArea >= 0.4
  ) {
    stage = "severe";
    stageLabel = "Insuficiencia mitral severa";
  } else if (regurgitantFraction >= 0.4) {
    stage = "moderate-high";
    stageLabel = "Moderada-alta · grado III";
  } else if (
    regurgitantFraction >= 0.3 ||
    regurgitantVolume >= 30 ||
    effectiveRegurgitantOrificeArea >= 0.2
  ) {
    stage = "moderate";
    stageLabel = "Insuficiencia mitral moderada";
  }

  const pulmonaryVenousFlow =
    stage === "severe"
      ? "systolic-reversal"
      : stage === "moderate-high" || stage === "moderate"
        ? "blunted"
        : "normal";

  return {
    stage,
    stageLabel,
    regurgitantFraction,
    totalStrokeVolume,
    regurgitantVolume,
    forwardStrokeVolume,
    effectiveRegurgitantOrificeArea,
    regurgitantJetVelocity,
    endDiastolicVolume,
    endSystolicVolume,
    ejectionFraction,
    contractility,
    leftVentricularDilation,
    leftAtrialDilation,
    coaptationGapFraction,
    pulmonaryVenousFlow,
    estimatedLeftAtrialPressure,
  };
}

const gaussian = (x: number, center: number, width: number) => {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
};

/**
 * Sinus ECG whose optional LA/LV enlargement signs follow chamber remodeling,
 * not RF, RVol or EROA. A normal-looking ECG therefore remains possible.
 */
export function mitralRegurgitationEcgValue(
  time: number,
  heartRate: number,
  lead: EcgLead,
  leftAtrialDilation: number,
  leftVentricularDilation: number,
) {
  const rate = clamp(heartRate, 28, 220);
  const phase = ((time / (60 / rate)) % 1 + 1) % 1;
  const la = clamp(leftAtrialDilation);
  const lv = clamp(leftVentricularDilation);
  const atrialRemodeling = clamp((la - 0.28) / 0.72);

  if (lead === "V2") {
    const p =
      (0.11 + atrialRemodeling * 0.02) *
        gaussian(phase, 0.14, 0.026) -
      atrialRemodeling * 0.11 * gaussian(phase, 0.193, 0.026);
    const qrs =
      -0.04 * gaussian(phase, 0.288, 0.01) +
      (0.45 - lv * 0.05) * gaussian(phase, 0.31, 0.009) -
      (0.7 + lv * 0.42) * gaussian(phase, 0.342, 0.014);
    const t = 0.22 * gaussian(phase, 0.59, 0.065);
    return p + qrs + t;
  }

  const earlyP =
    (0.105 + atrialRemodeling * 0.025) *
    gaussian(phase, 0.135, 0.027);
  const lateP =
    (0.06 + atrialRemodeling * 0.09) *
    gaussian(phase, 0.19, 0.028);
  const p = earlyP + lateP;

  if (lead === "V5") {
    const qrs =
      -0.07 * gaussian(phase, 0.288, 0.011) +
      (1.05 + lv * 0.5) * gaussian(phase, 0.31, 0.01) -
      0.16 * gaussian(phase, 0.34, 0.013);
    return p + qrs + 0.31 * gaussian(phase, 0.59, 0.07);
  }

  const qrs =
    -0.1 * gaussian(phase, 0.288, 0.012) +
    (1.02 + lv * 0.18) * gaussian(phase, 0.31, 0.01) -
    0.28 * gaussian(phase, 0.338, 0.014);
  return p + qrs + 0.3 * gaussian(phase, 0.59, 0.068);
}
