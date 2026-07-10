import type { EcgLead } from "./vtModel";

export type AvBlockStage = 1 | 2 | 3 | 4;

export const AV_BLOCK_LABELS: Record<AvBlockStage, string> = {
  1: "1.º grado",
  2: "Mobitz I · Wenckebach",
  3: "Mobitz II",
  4: "Bloqueo AV completo",
};

export type AvVentricularEvent = {
  time: number;
  sourceAtrialIndex: number | null;
  kind: "conducted" | "escape";
  qrsWidthMs: number;
};

export type AvBlockRhythm = {
  stage: AvBlockStage;
  atrialBeatIndex: number;
  ventricularBeatIndex: number;
  atrialPhase: number;
  ventricularPhase: number;
  prIntervalMs: number | null;
  dropped: boolean;
  conductionProgress: number;
  ventricularEscape: boolean;
  lastVentricularEvent: AvVentricularEvent;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

const gaussian = (value: number, center: number, width: number) => {
  const z = (value - center) / width;
  return Math.exp(-0.5 * z * z);
};

export function toAvBlockStage(value: number): AvBlockStage {
  return clamp(Math.round(value), 1, 4) as AvBlockStage;
}

function conductionForAtrialBeat(index: number, stage: AvBlockStage) {
  if (stage === 1) return { conducted: true, prSeconds: 0.24 };
  if (stage === 2) {
    const sequence = positiveModulo(index, 4);
    if (sequence === 3) return { conducted: false, prSeconds: null };
    return {
      conducted: true,
      prSeconds: [0.18, 0.24, 0.31][sequence],
    };
  }
  if (stage === 3) {
    const conducted = positiveModulo(index, 3) !== 2;
    return { conducted, prSeconds: conducted ? 0.18 : null };
  }
  return { conducted: false, prSeconds: null };
}

export function getAvVentricularEvents(
  time: number,
  atrialRate: number,
  ventricularRate: number,
  stage: AvBlockStage,
): AvVentricularEvent[] {
  if (stage === 4) {
    const period = 60 / Math.max(28, ventricularRate);
    const currentIndex = Math.floor((time - 0.12) / period);
    return Array.from({ length: 4 }, (_, offset) => {
      const index = currentIndex - 2 + offset;
      return {
        time: 0.12 + index * period,
        sourceAtrialIndex: null,
        kind: "escape" as const,
        qrsWidthMs: 150,
      };
    });
  }

  const atrialPeriod = 60 / Math.max(40, atrialRate);
  const currentAtrialIndex = Math.floor(time / atrialPeriod);
  const events: AvVentricularEvent[] = [];
  for (let index = currentAtrialIndex - 6; index <= currentAtrialIndex + 1; index += 1) {
    const conduction = conductionForAtrialBeat(index, stage);
    if (!conduction.conducted || conduction.prSeconds === null) continue;
    events.push({
      time: index * atrialPeriod + conduction.prSeconds,
      sourceAtrialIndex: index,
      kind: "conducted",
      qrsWidthMs: stage === 3 ? 130 : 86,
    });
  }
  return events;
}

export function getAvBlockRhythm(
  time: number,
  atrialRate: number,
  ventricularRate: number,
  stage: AvBlockStage,
): AvBlockRhythm {
  const atrialPeriod = 60 / Math.max(40, atrialRate);
  const atrialBeatIndex = Math.floor(time / atrialPeriod);
  const atrialElapsed = positiveModulo(time, atrialPeriod);
  const currentConduction = conductionForAtrialBeat(atrialBeatIndex, stage);
  const events = getAvVentricularEvents(
    time,
    atrialRate,
    ventricularRate,
    stage,
  ).filter((event) => event.time <= time);
  const lastVentricularEvent = events.at(-1) ?? {
    time: time - 2,
    sourceAtrialIndex: null,
    kind: "escape" as const,
    qrsWidthMs: 150,
  };
  const ventricularElapsed = Math.max(0, time - lastVentricularEvent.time);
  const atrialRawPhase = atrialElapsed / atrialPeriod;
  const atrialPhase = positiveModulo(atrialRawPhase + 0.76, 1);
  const dropped = !currentConduction.conducted;
  const nominalPr = currentConduction.prSeconds ?? 0.18;
  const conductionProgress = dropped
    ? Math.min(0.43, clamp(atrialElapsed / nominalPr) * 0.43)
    : clamp(atrialElapsed / nominalPr);

  return {
    stage,
    atrialBeatIndex,
    ventricularBeatIndex:
      lastVentricularEvent.sourceAtrialIndex ??
      Math.floor(lastVentricularEvent.time / (60 / Math.max(28, ventricularRate))),
    atrialPhase,
    ventricularPhase: Math.min(ventricularElapsed / 0.82, 0.995),
    prIntervalMs:
      currentConduction.prSeconds === null
        ? null
        : currentConduction.prSeconds * 1000,
    dropped,
    conductionProgress,
    ventricularEscape: lastVentricularEvent.kind === "escape",
    lastVentricularEvent,
  };
}

function pWave(secondsSinceP: number, lead: EcgLead) {
  const amplitude = lead === "DII" ? 0.13 : lead === "V2" ? 0.07 : 0.1;
  return amplitude * gaussian(secondsSinceP, 0.045, 0.016);
}

function conductedComplex(
  elapsed: number,
  lead: EcgLead,
  wide: boolean,
) {
  const widthScale = wide ? 1.55 : 1;
  const polarity = lead === "V2" ? -0.72 : lead === "V5" ? 1.05 : 0.96;
  const q = -0.1 * gaussian(elapsed, 0.012, 0.006 * widthScale);
  const r = polarity * gaussian(elapsed, 0.032 * widthScale, 0.009 * widthScale);
  const s =
    (lead === "V2" ? -0.36 : -0.24) *
    gaussian(elapsed, 0.052 * widthScale, 0.012 * widthScale);
  const t =
    (lead === "V2" ? 0.18 : 0.29) *
    gaussian(elapsed, wide ? 0.3 : 0.27, 0.065);
  return q + r + s + t;
}

function escapeComplex(elapsed: number, lead: EcgLead) {
  const main = lead === "V2" ? -0.96 : lead === "V5" ? 0.88 : 0.7;
  const oppositeT = main > 0 ? -0.3 : 0.3;
  return (
    main * gaussian(elapsed, 0.075, 0.045) -
    main * 0.34 * gaussian(elapsed, 0.145, 0.035) +
    oppositeT * gaussian(elapsed, 0.31, 0.075)
  );
}

export function avBlockEcgValue(
  time: number,
  atrialRate: number,
  ventricularRate: number,
  stage: AvBlockStage,
  lead: EcgLead,
) {
  const atrialPeriod = 60 / Math.max(40, atrialRate);
  const atrialElapsed = positiveModulo(time, atrialPeriod);
  let signal = pWave(atrialElapsed, lead);

  const events = getAvVentricularEvents(
    time,
    atrialRate,
    ventricularRate,
    stage,
  );
  events.forEach((event) => {
    const elapsed = time - event.time;
    if (elapsed < -0.02 || elapsed > 0.52) return;
    signal +=
      event.kind === "escape"
        ? escapeComplex(elapsed, lead)
        : conductedComplex(elapsed, lead, event.qrsWidthMs > 120);
  });
  return signal;
}
