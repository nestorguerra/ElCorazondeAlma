import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AV_BLOCK_LABELS,
  getAvBlockRhythm,
  getAvVentricularEvents,
} from "../app/avBlockModel.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  formatSpecific,
  getDisease,
} from "../app/simulation.ts";

test("uses four discrete clinical AV-block states", () => {
  const disease = getDisease("av-block");
  assert.equal(formatSpecific(disease, 1), AV_BLOCK_LABELS[1]);
  assert.equal(formatSpecific(disease, 2), AV_BLOCK_LABELS[2]);
  assert.equal(formatSpecific(disease, 3), AV_BLOCK_LABELS[3]);
  assert.equal(formatSpecific(disease, 4), AV_BLOCK_LABELS[4]);
});

test("models first-degree and Wenckebach PR timing", () => {
  const atrialRate = 75;
  const atrialPeriod = 60 / atrialRate;
  const firstDegree = getAvVentricularEvents(3, atrialRate, 75, 1);
  const firstEvent = firstDegree.find((event) => event.sourceAtrialIndex === 2);
  assert.ok(firstEvent);
  assert.ok(Math.abs(firstEvent.time - (2 * atrialPeriod + 0.24)) < 1e-9);

  const wenckebach = getAvVentricularEvents(3, atrialRate, 56, 2);
  const group = wenckebach.filter(
    (event) => event.sourceAtrialIndex >= 0 && event.sourceAtrialIndex <= 3,
  );
  assert.deepEqual(
    group.map((event) => event.sourceAtrialIndex),
    [0, 1, 2],
  );
  assert.deepEqual(
    group.map((event) => Math.round((event.time - event.sourceAtrialIndex * atrialPeriod) * 1000)),
    [180, 240, 310],
  );
});

test("models Mobitz II sudden drops and complete AV dissociation", () => {
  const mobitzTwo = getAvVentricularEvents(3, 72, 48, 3);
  const indices = mobitzTwo.map((event) => event.sourceAtrialIndex);
  assert.ok(indices.every((index) => index % 3 !== 2));
  assert.ok(mobitzTwo.every((event) => event.qrsWidthMs === 130));

  const complete = getAvVentricularEvents(4, 72, 38, 4);
  assert.ok(complete.every((event) => event.sourceAtrialIndex === null));
  assert.ok(complete.every((event) => event.kind === "escape"));
  assert.ok(complete.every((event) => event.qrsWidthMs === 150));

  const rhythm = getAvBlockRhythm(4, 72, 38, 4);
  assert.equal(rhythm.dropped, true);
  assert.equal(rhythm.ventricularEscape, true);
  assert.ok(rhythm.conductionProgress <= 0.43);
});

test("derives falling ventricular rate and output across AV-block grades", () => {
  const disease = getDisease("av-block");
  const first = deriveSimulation(DEFAULT_VITALS, disease, 44, 1, 0);
  const wenckebach = deriveSimulation(DEFAULT_VITALS, disease, 44, 2, 0);
  const mobitzTwo = deriveSimulation(DEFAULT_VITALS, disease, 44, 3, 0);
  const complete = deriveSimulation(DEFAULT_VITALS, disease, 44, 4, 0);

  assert.equal(first.heartRate, first.atrialRate);
  assert.equal(wenckebach.heartRate, Math.round(first.atrialRate * 0.75));
  assert.equal(mobitzTwo.heartRate, Math.round(first.atrialRate * (2 / 3)));
  assert.ok(complete.heartRate < mobitzTwo.heartRate);
  assert.ok(complete.cardiacOutput < first.cardiacOutput);
  assert.equal(mobitzTwo.stability, "Vigilancia");
});

test("shares the AV event model between ECG and 3D motion", async () => {
  const [ecg, heart, simulation] = await Promise.all([
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/simulation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(ecg, /avBlockEcgValue/);
  assert.match(ecg, /PR 180 → 240 → 310 ms/);
  assert.match(heart, /getAvBlockRhythm/);
  assert.match(heart, /avRhythm\.conductionProgress/);
  assert.match(heart, /escapeFocus/);
  assert.match(simulation, /Tipo de bloqueo AV/);
  assert.doesNotMatch(simulation, /Impulsos no conducidos/);
});
