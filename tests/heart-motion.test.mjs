import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getAfibBeat } from "../app/afibModel.ts";
import { computeCardiacMotion } from "../app/heartMotion.ts";
import { DEFAULT_VITALS, deriveSimulation, getDisease } from "../app/simulation.ts";

const baseInput = {
  beatIndex: 0,
  diseaseId: "aortic-stenosis",
  severity: 0.4,
  contractility: 0.9,
};

test("separates atrial contraction, ventricular ejection and filling", () => {
  const ventricular = computeCardiacMotion({ ...baseInput, phase: 0.2 });
  const filling = computeCardiacMotion({ ...baseInput, phase: 0.7 });
  const atrial = computeCardiacMotion({ ...baseInput, phase: 0.86 });

  assert.equal(ventricular.stage, "ventricles");
  assert.ok(ventricular.ventricular > 0.9);
  assert.ok(ventricular.atrial < 0.2);
  assert.equal(filling.stage, "filling");
  assert.equal(atrial.stage, "atria");
  assert.ok(atrial.atrial > 0.9);
});

test("models disease-specific mechanical movement", () => {
  const afib = computeCardiacMotion({
    ...baseInput,
    phase: 0.86,
    diseaseId: "afib",
    severity: 0.8,
  });
  const ischemia = computeCardiacMotion({
    ...baseInput,
    diseaseId: "ischemia",
    severity: 0.8,
  });
  const infarction = computeCardiacMotion({
    ...baseInput,
    diseaseId: "infarction",
    severity: 0.8,
  });
  const blocked = computeCardiacMotion({
    ...baseInput,
    phase: 0.2,
    beatIndex: 1,
    diseaseId: "av-block",
    severity: 0.8,
  });

  assert.equal(afib.atrial, 0);
  assert.ok(afib.atrialFlutter > 0.5);
  assert.ok(infarction.regionalDysfunction > ischemia.regionalDysfunction);
  assert.equal(blocked.skipped, true);
  assert.equal(blocked.ventricular, 0);
});

test("models AF as aperiodic R-R intervals with beat-to-beat force variation", () => {
  const beats = new Map();
  for (let position = 0; position < 16; position += 0.025) {
    const beat = getAfibBeat(position, 0.78);
    beats.set(beat.beatIndex, beat);
  }

  const sample = [...beats.values()].slice(2, 14);
  const intervals = sample.map((beat) => beat.interval);
  const strengths = sample.map((beat) => beat.ventricularStrength);
  const roundedIntervals = new Set(intervals.map((value) => value.toFixed(3)));

  assert.ok(roundedIntervals.size >= 10, "R-R intervals should not repeat in a short pattern");
  assert.ok(Math.min(...intervals) > 0.5);
  assert.ok(Math.max(...intervals) < 1.5);
  assert.ok(Math.max(...strengths) - Math.min(...strengths) > 0.15);
});

test("keeps intrinsic ventricular contractility and EF while AF removes atrial contribution", () => {
  const simulation = deriveSimulation(
    DEFAULT_VITALS,
    getDisease("afib"),
    44,
    70,
    0,
  );

  assert.equal(simulation.heartRate, DEFAULT_VITALS.heartRate);
  assert.equal(simulation.contractility, 1);
  assert.ok(simulation.ejectionFraction >= 60);
  assert.equal(simulation.rhythmIrregularity, 0.7);
  assert.ok(simulation.strokeVolume < 74);
});

test("separates AF mean ventricular rate from didactic R-R variability", () => {
  const fastVitals = { ...DEFAULT_VITALS, heartRate: 132 };
  const lowVariability = deriveSimulation(
    fastVitals,
    getDisease("afib"),
    44,
    35,
    0,
  );
  const highVariability = deriveSimulation(
    fastVitals,
    getDisease("afib"),
    44,
    90,
    0,
  );

  assert.equal(lowVariability.heartRate, 132);
  assert.equal(highVariability.heartRate, 132);
  assert.equal(lowVariability.rhythmIrregularity, 0.35);
  assert.equal(highVariability.rhythmIrregularity, 0.9);

  const lowIntervals = [];
  const highIntervals = [];
  for (let index = 0; index < 16; index += 1) {
    lowIntervals.push(getAfibBeat(index + 0.4, 0.35).interval);
    highIntervals.push(getAfibBeat(index + 0.4, 0.9).interval);
  }
  const spread = (values) => Math.max(...values) - Math.min(...values);
  assert.ok(spread(highIntervals) > spread(lowIntervals));
});

test("deforms the anatomical mesh regionally and keeps surface vessels moving", async () => {
  const source = await readFile(
    new URL("../app/HeartScene.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /regional-heart-motion-v2/);
  assert.match(source, /uRegionalDysfunction/);
  assert.match(source, /uAtrialFlutter/);
  assert.match(source, /uDyssynchrony/);
  assert.match(source, /coronaryLayer/);
  assert.match(source, /motionTelemetry/);
  assert.match(source, /getAfibBeat/);
  assert.match(source, /ventricularStrength/);
  assert.match(source, /AFIB_ATRIAL_FOCI/);
});

test("renders AF ECG without P waves and with calibrated paper spacing", async () => {
  const source = await readFile(
    new URL("../app/EcgMonitor.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /secondsSinceBeat/);
  assert.match(source, /fibrillatoryBaseline/);
  assert.match(source, /simulation\.rhythmIrregularity/);
  assert.match(source, /!reducedMotion/);
  assert.match(source, /Ausentes · ondas f/);
  assert.match(source, /horizontalSmallBox.*0\.04/s);
  assert.doesNotMatch(source, /irregularWarp/);
});
