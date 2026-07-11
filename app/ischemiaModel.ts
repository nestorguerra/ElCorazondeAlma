import type { EcgLead } from "./vtModel";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const gaussian = (x: number, center: number, width: number) => {
  const z = (x - center) / width;
  return Math.exp(-0.5 * z * z);
};

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const plateau = (x: number, start: number, end: number, edge = 0.008) =>
  sigmoid((x - start) / edge) - sigmoid((x - end) / edge);

const smoothStep = (start: number, end: number, value: number) => {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
};

const LEAD_MORPHOLOGY: Record<
  EcgLead,
  {
    p: number;
    q: number;
    r: number;
    s: number;
    t: number;
    stDepression: number;
    tInversion: number;
  }
> = {
  DII: {
    p: 0.13,
    q: -0.1,
    r: 1.03,
    s: -0.28,
    t: 0.27,
    stDepression: 0.065,
    tInversion: 0.18,
  },
  V2: {
    p: 0.08,
    q: -0.045,
    r: 0.44,
    s: -0.72,
    t: 0.21,
    stDepression: 0.12,
    tInversion: 0.36,
  },
  V5: {
    p: 0.1,
    q: -0.08,
    r: 1.08,
    s: -0.21,
    t: 0.31,
    stDepression: 0.23,
    tInversion: 0.62,
  },
};

/**
 * One sinus complex expressed in seconds from the beginning of the P wave.
 * Absolute timings keep QRS/ST/T duration physiologically stable as rate changes.
 */
export function ischemiaComplex(
  elapsedSeconds: number,
  burden: number,
  lead: EcgLead,
) {
  const morphology = LEAD_MORPHOLOGY[lead];
  const electricalBurden = smoothStep(0.18, 0.82, burden);

  const p = morphology.p * gaussian(elapsedSeconds, 0.07, 0.022);
  const q = morphology.q * gaussian(elapsedSeconds, 0.148, 0.006);
  const r = morphology.r * gaussian(elapsedSeconds, 0.164, 0.008);
  const s = morphology.s * gaussian(elapsedSeconds, 0.184, 0.011);
  const t = morphology.t * gaussian(elapsedSeconds, 0.39, 0.058);

  // Subendocardial anterolateral ischemia: a regional horizontal-to-downsloping
  // ST depression followed by a symmetric negative T wave. QRS remains narrow.
  const stWindow = plateau(elapsedSeconds, 0.218, 0.326, 0.008);
  const stSlope = clamp((elapsedSeconds - 0.218) / 0.108);
  const stChange =
    -morphology.stDepression *
    electricalBurden *
    stWindow *
    (0.88 + stSlope * 0.12);
  const tChange =
    -morphology.tInversion *
    electricalBurden *
    gaussian(elapsedSeconds, 0.39, 0.06);

  return p + q + r + s + t + stChange + tChange;
}

export function ischemiaEcgValue(
  time: number,
  heartRate: number,
  burden: number,
  lead: EcgLead,
) {
  const period = 60 / Math.max(40, heartRate);
  const elapsed = ((time % period) + period) % period;

  // Include the tail of the previous complex at faster sinus rates.
  return (
    ischemiaComplex(elapsed, burden, lead) +
    ischemiaComplex(elapsed + period, burden, lead)
  );
}
