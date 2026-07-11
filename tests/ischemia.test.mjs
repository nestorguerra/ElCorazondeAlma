import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { computeCardiacMotion } from "../app/heartMotion.ts";
import { ischemiaComplex } from "../app/ischemiaModel.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("keeps sinus QRS narrow while regional ST-T changes emerge with burden", () => {
  const qrsLow = ischemiaComplex(0.164, 0, "V5");
  const qrsHigh = ischemiaComplex(0.164, 1, "V5");
  assert.ok(Math.abs(qrsHigh - qrsLow) < 0.005);

  const stV5Low = ischemiaComplex(0.27, 0, "V5");
  const stV5High = ischemiaComplex(0.27, 1, "V5");
  const stV2Low = ischemiaComplex(0.27, 0, "V2");
  const stV2High = ischemiaComplex(0.27, 1, "V2");
  const stDiiLow = ischemiaComplex(0.27, 0, "DII");
  const stDiiHigh = ischemiaComplex(0.27, 1, "DII");

  assert.ok(stV5High < -0.18);
  assert.ok(stV5Low - stV5High > stV2Low - stV2High);
  assert.ok(stV2Low - stV2High > stDiiLow - stDiiHigh);
  assert.ok(ischemiaComplex(0.39, 1, "V5") < 0);
});

test("does not force visible ischemic ECG changes below the electrical threshold", () => {
  const healthySt = ischemiaComplex(0.27, 0, "V5");
  const mildSt = ischemiaComplex(0.27, 0.12, "V5");
  const healthyT = ischemiaComplex(0.39, 0, "V5");
  const mildT = ischemiaComplex(0.39, 0.12, "V5");

  assert.equal(mildSt, healthySt);
  assert.equal(mildT, healthyT);
});

test("combines coronary supply, rate-pressure demand and oxygenation", () => {
  const disease = getDisease("ischemia");
  const baseline = deriveSimulation(DEFAULT_VITALS, disease, 44, 48, 0);
  const highDemand = deriveSimulation(
    { ...DEFAULT_VITALS, heartRate: 140, systolic: 180 },
    disease,
    44,
    48,
    0,
  );
  const hypoxic = deriveSimulation(
    { ...DEFAULT_VITALS, spo2: 84 },
    disease,
    44,
    48,
    0,
  );
  const lowFlow = deriveSimulation(DEFAULT_VITALS, disease, 44, 90, 0);

  assert.equal(baseline.coronaryFlowFraction, 0.52);
  assert.ok(Math.abs(lowFlow.coronaryFlowFraction - 0.1) < 1e-9);
  assert.ok(highDemand.supplyDemandImbalance > baseline.supplyDemandImbalance);
  assert.ok(hypoxic.supplyDemandImbalance > baseline.supplyDemandImbalance);
  assert.ok(lowFlow.severity > baseline.severity);
});

test("progresses from preserved motion to regional delay and hypokinesis", () => {
  const low = computeCardiacMotion({
    phase: 0.2,
    beatIndex: 0,
    diseaseId: "ischemia",
    severity: 0.1,
    contractility: 1,
  });
  const high = computeCardiacMotion({
    phase: 0.2,
    beatIndex: 0,
    diseaseId: "ischemia",
    severity: 0.85,
    contractility: 0.94,
  });

  assert.equal(low.regionalDysfunction, 0);
  assert.equal(low.regionalDelay, 0);
  assert.ok(high.regionalDysfunction > 0.6);
  assert.ok(high.regionalDelay > 0.075);
  assert.ok(high.regionalDysfunction < 0.7);
});

test("wires ischemia-specific perfusion and delayed regional deformation", async () => {
  const [ecg, heart] = await Promise.all([
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(ecg, /ischemiaEcgValue/);
  assert.doesNotMatch(ecg, /pattern === "ischemia"\) \{\s+const regional/);
  assert.match(heart, /uIschemiaMode/);
  assert.match(heart, /uRegionalDelay/);
  assert.match(heart, /coronaryPerfusion/);
  assert.match(heart, /coronaryFlowFraction/);
});
