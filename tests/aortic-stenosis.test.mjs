import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  aorticStenosisEcgValue,
  deriveAorticStenosisProgression,
} from "../app/aorticStenosisModel.ts";
import { computeCardiacMotion } from "../app/heartMotion.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("integrates area, velocity and mean gradient for mild-to-severe AS", () => {
  const mild = deriveAorticStenosisProgression(1.8, 25, 1, 72, 118);
  const moderate = deriveAorticStenosisProgression(1.2, 45, 4, 72, 118);
  const severe = deriveAorticStenosisProgression(0.9, 60, 7, 72, 118);
  const verySevere = deriveAorticStenosisProgression(0.7, 80, 10, 72, 118);

  assert.equal(mild.stage, "mild");
  assert.equal(moderate.stage, "moderate");
  assert.ok(moderate.peakVelocity >= 3 && moderate.peakVelocity < 4);
  assert.ok(moderate.meanGradient >= 20 && moderate.meanGradient < 40);
  assert.equal(severe.stage, "severe-high-gradient");
  assert.ok(severe.peakVelocity >= 4);
  assert.ok(severe.meanGradient >= 40);
  assert.equal(verySevere.stage, "very-severe-high-gradient");
  assert.ok(verySevere.peakVelocity >= 5 || verySevere.meanGradient >= 60);
});

test("keeps preserved EF while pressure load drives concentric remodeling", () => {
  const early = deriveAorticStenosisProgression(1.2, 10, 0, 72, 118);
  const chronic = deriveAorticStenosisProgression(1.2, 90, 12, 72, 155);

  assert.equal(early.valveArea, chronic.valveArea);
  assert.ok(chronic.concentricHypertrophy > early.concentricHypertrophy);
  assert.ok(
    chronic.longitudinalShorteningLoss > early.longitudinalShorteningLoss,
  );
  assert.ok(chronic.lvSystolicPressure > early.lvSystolicPressure);
  assert.ok(early.ejectionFraction >= 50);
  assert.ok(chronic.ejectionFraction >= 50);
  assert.ok(chronic.contractility >= 0.95);
});

test("allows tachycardia to create low flow and lower the flow-dependent gradient", () => {
  const ordinaryRate = deriveAorticStenosisProgression(0.9, 60, 5, 72, 118);
  const tachycardia = deriveAorticStenosisProgression(0.9, 60, 5, 180, 118);

  assert.equal(ordinaryRate.flowState, "normal");
  assert.equal(tachycardia.flowState, "low");
  assert.ok(tachycardia.strokeVolumeIndex < 35);
  assert.ok(tachycardia.peakVelocity < ordinaryRate.peakVelocity);
  assert.equal(tachycardia.valveArea, ordinaryRate.valveArea);
});

test("makes LVH and lateral strain depend on remodeling, not directly on valve area", () => {
  const lowRemodelingR = aorticStenosisEcgValue(0.31, 60, "V5", 0.12);
  const highRemodelingR = aorticStenosisEcgValue(0.31, 60, "V5", 0.9);
  const lowRemodelingT = aorticStenosisEcgValue(0.59, 60, "V5", 0.12);
  const highRemodelingT = aorticStenosisEcgValue(0.59, 60, "V5", 0.9);
  const lowRemodelingS = aorticStenosisEcgValue(0.342, 60, "V2", 0.12);
  const highRemodelingS = aorticStenosisEcgValue(0.342, 60, "V2", 0.9);

  assert.ok(highRemodelingR > lowRemodelingR);
  assert.ok(highRemodelingT < 0);
  assert.ok(lowRemodelingT > 0);
  assert.ok(highRemodelingS < lowRemodelingS);
});

test("extends coordinated ventricular systole without introducing dyssynchrony", () => {
  const normal = computeCardiacMotion({
    phase: 0.68,
    beatIndex: 0,
    diseaseId: "heart-failure",
    severity: 0.9,
    contractility: 1,
  });
  const stenosis = computeCardiacMotion({
    phase: 0.68,
    beatIndex: 0,
    diseaseId: "aortic-stenosis",
    severity: 0.9,
    contractility: 1,
  });

  assert.ok(stenosis.ventricular > normal.ventricular);
  assert.equal(stenosis.dyssynchrony, 0);
  assert.equal(stenosis.regionalDysfunction, 0);
});

test("connects the aortic model to flow, EF and risk without LDL changing its mechanics", () => {
  const disease = getDisease("aortic-stenosis");
  const baseline = deriveSimulation(DEFAULT_VITALS, disease, 60, 0.9, 7);
  const highLdl = deriveSimulation(
    { ...DEFAULT_VITALS, ldl: 240 },
    disease,
    60,
    0.9,
    7,
  );

  assert.equal(baseline.aorticStenosis.stage, "severe-high-gradient");
  assert.equal(baseline.strokeVolume, baseline.aorticStenosis.strokeVolume);
  assert.equal(
    baseline.ejectionFraction,
    baseline.aorticStenosis.ejectionFraction,
  );
  assert.equal(baseline.contractility, baseline.aorticStenosis.contractility);
  assert.equal(
    baseline.aorticStenosis.peakVelocity,
    highLdl.aorticStenosis.peakVelocity,
  );
  assert.equal(baseline.riskIndex, highLdl.riskIndex);
});

test("wires restricted valve opening, turbulent jet, hypertrophy and ECG to the UI", async () => {
  const [heartScene, ecgMonitor, cardioLab] = await Promise.all([
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(heartScene, /aorticValveOrifice/);
  assert.match(heartScene, /valveOpeningFraction/);
  assert.match(heartScene, /peakVelocity/);
  assert.match(heartScene, /jetTurbulence/);
  assert.match(heartScene, /concentricHypertrophy/);
  assert.match(ecgMonitor, /aorticStenosisEcgValue/);
  assert.doesNotMatch(
    ecgMonitor,
    /pattern === "aortic-stenosis"[\s\S]{0,160}severity01/,
  );
  assert.match(cardioLab, /Gradiente medio/);
  assert.match(cardioLab, /Clasificación integrada/);
  assert.match(cardioLab, /ESC\/EACTS 2025/);
});
