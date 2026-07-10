export type AfibBeat = {
  beatIndex: number;
  beatStart: number;
  interval: number;
  precedingInterval: number;
  prePrecedingInterval: number;
  phase: number;
  elapsed: number;
  ventricularStrength: number;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function hash01(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function beatTime(index: number, irregularity: number) {
  const variability = clamp(irregularity);
  const jitterAmplitude = 0.07 + variability * 0.17;
  const jitter = (hash01(index, 7) * 2 - 1) * jitterAmplitude;
  return index + jitter;
}

/**
 * Deterministic, non-repeating atrial-fibrillation rhythm in mean-cycle units.
 * Event jitter is bounded so every R-R interval remains positive while the
 * long-term ventricular rate stays centred on the requested mean rate.
 */
export function getAfibBeat(
  rhythmPosition: number,
  irregularity = 0.78,
): AfibBeat {
  let beatIndex = Math.floor(rhythmPosition);

  while (rhythmPosition < beatTime(beatIndex, irregularity)) beatIndex -= 1;
  while (rhythmPosition >= beatTime(beatIndex + 1, irregularity)) beatIndex += 1;

  const beatStart = beatTime(beatIndex, irregularity);
  const nextBeat = beatTime(beatIndex + 1, irregularity);
  const precedingBeat = beatTime(beatIndex - 1, irregularity);
  const prePrecedingBeat = beatTime(beatIndex - 2, irregularity);
  const interval = nextBeat - beatStart;
  const precedingInterval = beatStart - precedingBeat;
  const prePrecedingInterval = precedingBeat - prePrecedingBeat;

  // In AF, preceding and pre-preceding R-R intervals alter filling and the
  // force-interval relationship, so consecutive ventricular beats differ.
  const ventricularStrength = clamp(
    0.66 + precedingInterval * 0.42 - prePrecedingInterval * 0.1,
    0.7,
    1.18,
  );

  return {
    beatIndex,
    beatStart,
    interval,
    precedingInterval,
    prePrecedingInterval,
    phase: clamp((rhythmPosition - beatStart) / interval),
    elapsed: Math.max(0, rhythmPosition - beatStart),
    ventricularStrength,
  };
}

export function afibRrIntervalMs(
  intervalInMeanCycles: number,
  meanVentricularRate: number,
) {
  return (intervalInMeanCycles * 60_000) / Math.max(28, meanVentricularRate);
}
