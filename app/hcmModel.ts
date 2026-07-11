export type EcgLead = "DII" | "V2" | "V5";

export type HcmStage =
  | "borderline-thickness"
  | "non-obstructive"
  | "obstructive"
  | "significant-obstruction";

export type HcmProgression = {
  stage: HcmStage;
  stageLabel: string;
  septalThickness: number;
  posteriorWallThickness: number;
  asymmetryRatio: number;
  hypertrophyFraction: number;
  remodelingFraction: number;
  diastolicStiffness: number;
  cavityReduction: number;
  leftAtrialDilation: number;
  systolicAnteriorMotion: number;
  lvotGradient: number;
  peakVelocity: number;
  lvotObstructionFraction: number;
  jetTurbulence: number;
  mitralRegurgitantFraction: number;
  totalStrokeVolume: number;
  regurgitantVolume: number;
  forwardStrokeVolume: number;
  endDiastolicVolume: number;
  endSystolicVolume: number;
  ejectionFraction: number;
  contractility: number;
  ecgRemodeling: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const EMPTY_HCM_PROGRESSION: HcmProgression = {
  stage: "non-obstructive",
  stageLabel: "MCH basal-septal · no obstructiva",
  septalThickness: 15,
  posteriorWallThickness: 10,
  asymmetryRatio: 1.5,
  hypertrophyFraction: 0.09,
  remodelingFraction: 0.1,
  diastolicStiffness: 0.2,
  cavityReduction: 0.08,
  leftAtrialDilation: 0.08,
  systolicAnteriorMotion: 0.1,
  lvotGradient: 7,
  peakVelocity: 1.32,
  lvotObstructionFraction: 0.02,
  jetTurbulence: 0.05,
  mitralRegurgitantFraction: 0.015,
  totalStrokeVolume: 78,
  regurgitantVolume: 1,
  forwardStrokeVolume: 77,
  endDiastolicVolume: 116,
  endSystolicVolume: 38,
  ejectionFraction: 67,
  contractility: 1.02,
  ecgRemodeling: 0.08,
};

/**
 * Didactic phenotype: adult basal-septal hypertrophic cardiomyopathy with
 * sinus rhythm, preserved/hyperdynamic LVEF and potentially dynamic LVOT
 * obstruction caused by mitral systolic anterior motion (SAM). It explicitly
 * excludes apical HCM and end-stage systolic dysfunction.
 */
export function deriveHcmProgression(
  selectedSeptalThicknessMm: number,
  remodelingPercent: number,
  elapsedYears: number,
  heartRate = 72,
  systolicBloodPressure = 118,
): HcmProgression {
  const septalThickness = clamp(selectedSeptalThicknessMm, 13, 35);
  const hypertrophyFraction = clamp((septalThickness - 13) / 22);
  const timeExposure = clamp(elapsedYears / 15);
  const remodelingFraction = clamp(
    clamp(remodelingPercent / 100) * 0.52 +
      hypertrophyFraction * 0.34 +
      timeExposure * 0.14,
  );
  const posteriorWallThickness = clamp(
    10 + remodelingFraction * 3,
    9,
    14,
  );
  const asymmetryRatio = septalThickness / posteriorWallThickness;
  const diastolicStiffness = clamp(
    0.12 + hypertrophyFraction * 0.55 + remodelingFraction * 0.35,
  );
  const cavityReduction = clamp(
    hypertrophyFraction * 0.55 + remodelingFraction * 0.25,
  );
  const leftAtrialDilation = clamp(
    diastolicStiffness * 0.42 + timeExposure * 0.3,
  );

  const tachycardiaLoad = clamp((heartRate - 75) / 80);
  const reducedAfterload = clamp((118 - systolicBloodPressure) / 45);
  const systolicAnteriorMotion = clamp(
    0.13 +
      hypertrophyFraction * 0.52 +
      remodelingFraction * 0.2 +
      tachycardiaLoad * 0.22 +
      reducedAfterload * 0.18,
  );
  const lvotGradient = clamp(
    5 + 175 * systolicAnteriorMotion * systolicAnteriorMotion,
    5,
    130,
  );
  const peakVelocity = Math.sqrt(lvotGradient / 4);
  const lvotObstructionFraction = clamp((lvotGradient - 5) / 120);
  const jetTurbulence = clamp((lvotGradient - 12) / 88);

  const mitralRegurgitantFraction = clamp(
    0.015 + clamp((systolicAnteriorMotion - 0.28) / 0.62) * 0.22,
    0.015,
    0.24,
  );
  const contractility = clamp(
    1.02 + systolicAnteriorMotion * 0.08,
    1.02,
    1.1,
  );
  const ejectionFraction = clamp(
    67.5 + hypertrophyFraction * 5.5 + systolicAnteriorMotion * 1.5,
    66,
    75,
  );
  const endDiastolicVolume = clamp(
    128 -
      cavityReduction * 52 -
      diastolicStiffness * 10 -
      tachycardiaLoad * 18,
    62,
    128,
  );
  const totalStrokeVolume = endDiastolicVolume * (ejectionFraction / 100);
  const endSystolicVolume = endDiastolicVolume - totalStrokeVolume;
  const regurgitantVolume = totalStrokeVolume * mitralRegurgitantFraction;
  const forwardStrokeVolume = totalStrokeVolume - regurgitantVolume;
  const ecgRemodeling = clamp(
    hypertrophyFraction * 0.55 + remodelingFraction * 0.45,
  );

  let stage: HcmStage;
  let stageLabel: string;
  if (septalThickness < 15) {
    stage = "borderline-thickness";
    stageLabel = "Grosor limítrofe · no diagnóstico aislado";
  } else if (lvotGradient < 30) {
    stage = "non-obstructive";
    stageLabel = "MCH basal-septal · no obstructiva";
  } else if (lvotGradient < 50) {
    stage = "obstructive";
    stageLabel = "MCH obstructiva · gradiente ≥30 mmHg";
  } else {
    stage = "significant-obstruction";
    stageLabel = "MCH obstructiva significativa · gradiente ≥50 mmHg";
  }

  return {
    stage,
    stageLabel,
    septalThickness,
    posteriorWallThickness,
    asymmetryRatio,
    hypertrophyFraction,
    remodelingFraction,
    diastolicStiffness,
    cavityReduction,
    leftAtrialDilation,
    systolicAnteriorMotion,
    lvotGradient,
    peakVelocity,
    lvotObstructionFraction,
    jetTurbulence,
    mitralRegurgitantFraction,
    totalStrokeVolume,
    regurgitantVolume,
    forwardStrokeVolume,
    endDiastolicVolume,
    endSystolicVolume,
    ejectionFraction,
    contractility,
    ecgRemodeling,
  };
}

const gaussian = (x: number, center: number, width: number) => {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
};

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const plateau = (x: number, start: number, end: number, edge = 0.014) =>
  sigmoid((x - start) / edge) - sigmoid((x - end) / edge);

/**
 * Representative basal-septal HCM ECG. Remodeling produces high LV voltage,
 * narrow deep pseudo-infarction Q waves and lateral repolarization abnormality.
 * It deliberately avoids the giant negative T waves typical of apical HCM.
 */
export function hcmEcgValue(
  time: number,
  heartRate: number,
  lead: EcgLead,
  remodelingFraction: number,
) {
  const rate = clamp(heartRate, 28, 220);
  const phase = ((time / (60 / rate)) % 1 + 1) % 1;
  const remodeling = clamp(remodelingFraction);
  const p = (lead === "V2" ? 0.1 : 0.13) *
    gaussian(phase, 0.15, 0.026);

  if (lead === "V2") {
    const qrs =
      -0.04 * gaussian(phase, 0.286, 0.009) +
      (0.48 + remodeling * 0.16) * gaussian(phase, 0.31, 0.009) -
      (0.7 + remodeling * 0.72) * gaussian(phase, 0.341, 0.014);
    const st = -0.1 * remodeling * plateau(phase, 0.37, 0.5);
    const t =
      (0.2 * (1 - remodeling) - 0.34 * remodeling) *
      gaussian(phase, 0.59, 0.068);
    return p + qrs + st + t;
  }

  const lateralLead = lead === "V5";
  const narrowQ =
    -(lateralLead ? 0.09 + remodeling * 0.46 : 0.1 + remodeling * 0.3) *
    gaussian(phase, 0.286, 0.009);
  const r =
    (lateralLead ? 1.05 + remodeling * 1.02 : 1.02 + remodeling * 0.34) *
    gaussian(phase, 0.31, 0.009);
  const s =
    -(lateralLead ? 0.16 : 0.28) * gaussian(phase, 0.339, 0.013);
  const st =
    -(lateralLead ? 0.17 : 0.1) * remodeling *
    plateau(phase, 0.37, 0.51);
  const tAmplitude = lateralLead
    ? 0.31 * (1 - remodeling) - 0.55 * remodeling
    : 0.29 * (1 - remodeling) - 0.34 * remodeling;
  const t = tAmplitude * gaussian(phase, 0.59, 0.07);
  return p + narrowQ + r + s + st + t;
}
