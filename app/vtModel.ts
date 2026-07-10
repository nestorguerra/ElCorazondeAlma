export type EcgLead = "DII" | "V2" | "V5";

const gaussian = (value: number, center: number, width: number) => {
  const z = (value - center) / width;
  return Math.exp(-0.5 * z * z);
};

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

/**
 * Representative monomorphic VT complex with an RV-origin/LBBB-like pattern:
 * predominantly negative in V2, broad positive in V5, and secondary ST-T
 * discordance. Timing is expressed in seconds so QRS width remains broad even
 * when ventricular rate changes.
 */
export function vtVentricularComplex(
  secondsSinceBeat: number,
  lead: EcgLead,
) {
  if (secondsSinceBeat < -0.03 || secondsSinceBeat > 0.52) return 0;

  if (lead === "V2") {
    const smallR = 0.22 * gaussian(secondsSinceBeat, 0.025, 0.016);
    const broadS = -1.05 * gaussian(secondsSinceBeat, 0.088, 0.043);
    const terminalS = -0.28 * gaussian(secondsSinceBeat, 0.15, 0.032);
    const discordantT = 0.33 * gaussian(secondsSinceBeat, 0.285, 0.068);
    return smallR + broadS + terminalS + discordantT;
  }

  if (lead === "V5") {
    const q = -0.13 * gaussian(secondsSinceBeat, 0.024, 0.015);
    const broadR = 1.02 * gaussian(secondsSinceBeat, 0.075, 0.043);
    const slur = 0.24 * gaussian(secondsSinceBeat, 0.137, 0.027);
    const terminalS = -0.18 * gaussian(secondsSinceBeat, 0.18, 0.023);
    const discordantT = -0.34 * gaussian(secondsSinceBeat, 0.29, 0.07);
    return q + broadR + slur + terminalS + discordantT;
  }

  const q = -0.1 * gaussian(secondsSinceBeat, 0.022, 0.014);
  const broadR = 0.88 * gaussian(secondsSinceBeat, 0.068, 0.04);
  const broadS = -0.52 * gaussian(secondsSinceBeat, 0.137, 0.039);
  const discordantT = -0.3 * gaussian(secondsSinceBeat, 0.292, 0.072);
  return q + broadR + broadS + discordantT;
}

export function vtAtrialWave(
  time: number,
  atrialRate: number,
  lead: EcgLead,
) {
  const atrialPeriod = 60 / Math.max(40, atrialRate);
  const atrialElapsed = positiveModulo(time, atrialPeriod);
  const amplitude = lead === "DII" ? 0.11 : lead === "V2" ? 0.045 : 0.075;
  return amplitude * gaussian(atrialElapsed, 0.075, 0.018);
}

export function vtEcgValue(
  time: number,
  ventricularRate: number,
  atrialRate: number,
  lead: EcgLead,
) {
  const ventricularPeriod = 60 / Math.max(100, ventricularRate);
  const elapsed = positiveModulo(time, ventricularPeriod);

  // The preceding broad T wave can overlap the next complex at high rates.
  const ventricularSignal =
    vtVentricularComplex(elapsed, lead) +
    vtVentricularComplex(elapsed + ventricularPeriod, lead);
  return ventricularSignal + vtAtrialWave(time, atrialRate, lead);
}
