import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { computeCardiacMotion } from "../app/heartMotion.ts";
import { DEFAULT_VITALS, deriveSimulation, getDisease } from "../app/simulation.ts";
import {
  vtAtrialWave,
  vtVentricularComplex,
} from "../app/vtModel.ts";

test("renders a broad monomorphic complex with an RV-origin pattern", () => {
  assert.ok(vtVentricularComplex(0.09, "V2") < -0.7);
  assert.ok(vtVentricularComplex(0.09, "V5") > 0.75);
  assert.ok(Math.abs(vtVentricularComplex(0.16, "V2")) > 0.2);

  // Secondary repolarization is discordant to the dominant QRS direction.
  assert.ok(vtVentricularComplex(0.29, "V2") > 0.2);
  assert.ok(vtVentricularComplex(0.29, "V5") < -0.2);
});

test("keeps atrial activity independent from the ventricular tachycardia", () => {
  const atrialRate = 74;
  const atrialPeriod = 60 / atrialRate;
  const firstP = vtAtrialWave(0.075, atrialRate, "DII");
  const nextP = vtAtrialWave(0.075 + atrialPeriod, atrialRate, "DII");

  assert.ok(firstP > 0.1);
  assert.ok(Math.abs(firstP - nextP) < 1e-9);

  const ventricularOnly = computeCardiacMotion({
    phase: 0.2,
    atrialPhase: 0.4,
    beatIndex: 0,
    diseaseId: "vt",
    severity: 0.6,
    contractility: 0.9,
  });
  const coincidentAtrialBeat = computeCardiacMotion({
    phase: 0.2,
    atrialPhase: 0.86,
    beatIndex: 0,
    diseaseId: "vt",
    severity: 0.6,
    contractility: 0.9,
  });

  assert.ok(ventricularOnly.ventricular > 0.9);
  assert.ok(ventricularOnly.atrial < 0.05);
  assert.ok(coincidentAtrialBeat.atrial > 0.9);
  assert.ok(coincidentAtrialBeat.dyssynchrony > 0.5);
});

test("reduces filling and pump efficiency as ventricular rate rises", () => {
  const disease = getDisease("vt");
  const slower = deriveSimulation(DEFAULT_VITALS, disease, 44, 110, 0);
  const faster = deriveSimulation(DEFAULT_VITALS, disease, 44, 220, 0);

  assert.equal(slower.atrialRate, DEFAULT_VITALS.heartRate);
  assert.equal(faster.atrialRate, DEFAULT_VITALS.heartRate);
  assert.equal(slower.heartRate, 110);
  assert.equal(faster.heartRate, 220);
  assert.equal(slower.stability, "Vigilancia");
  assert.ok(faster.strokeVolume < slower.strokeVolume * 0.6);
  assert.ok(faster.ejectionFraction < slower.ejectionFraction);
});

test("uses regional delayed activation instead of random whole-heart shaking", async () => {
  const [heartSource, ecgSource, simulationSource] = await Promise.all([
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/simulation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(heartSource, /uCyclePhase/);
  assert.match(heartSource, /uVtMode/);
  assert.match(heartSource, /localVtPulse/);
  assert.match(heartSource, /vtFocus/);
  assert.doesNotMatch(heartSource, /vtShake/);
  assert.match(ecgSource, /vtEcgValue/);
  assert.match(ecgSource, /disease\.id === "afib" \|\| disease\.id === "vt"/);
  assert.match(simulationSource, /Monomórfico · ≈160 ms/);
});
