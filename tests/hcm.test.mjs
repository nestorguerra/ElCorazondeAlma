import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveHcmProgression,
  hcmEcgValue,
} from "../app/hcmModel.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("separates borderline thickness, non-obstructive HCM and dynamic LVOTO", () => {
  const borderline = deriveHcmProgression(13, 0, 0, 72, 118);
  const nonObstructive = deriveHcmProgression(17, 20, 1, 72, 118);
  const obstructive = deriveHcmProgression(21, 44, 0, 72, 118);
  const significant = deriveHcmProgression(30, 80, 8, 90, 105);

  assert.equal(borderline.stage, "borderline-thickness");
  assert.ok(borderline.lvotGradient < 30);
  assert.equal(nonObstructive.stage, "non-obstructive");
  assert.ok(nonObstructive.lvotGradient < 30);
  assert.equal(obstructive.stage, "obstructive");
  assert.ok(obstructive.lvotGradient >= 30 && obstructive.lvotGradient < 50);
  assert.equal(significant.stage, "significant-obstruction");
  assert.ok(significant.lvotGradient >= 50);
});

test("makes obstruction dynamic with tachycardia and reduced afterload", () => {
  const resting = deriveHcmProgression(21, 44, 2, 65, 135);
  const provoked = deriveHcmProgression(21, 44, 2, 125, 90);

  assert.ok(provoked.systolicAnteriorMotion > resting.systolicAnteriorMotion);
  assert.ok(provoked.lvotGradient > resting.lvotGradient);
  assert.ok(provoked.peakVelocity > resting.peakVelocity);
  assert.ok(provoked.endDiastolicVolume < resting.endDiastolicVolume);
  assert.ok(provoked.forwardStrokeVolume < resting.forwardStrokeVolume);
});

test("keeps EF hyperdynamic while stiffness and a small cavity reduce useful volume", () => {
  const mild = deriveHcmProgression(15, 15, 0, 72, 118);
  const marked = deriveHcmProgression(30, 80, 10, 72, 118);

  assert.ok(marked.ejectionFraction >= mild.ejectionFraction);
  assert.ok(marked.ejectionFraction >= 67);
  assert.ok(marked.endDiastolicVolume < mild.endDiastolicVolume);
  assert.ok(marked.forwardStrokeVolume < mild.forwardStrokeVolume);
  assert.ok(marked.diastolicStiffness > mild.diastolicStiffness);
  assert.ok(marked.contractility >= 1.02);
});

test("keeps total, regurgitant and forward stroke volumes internally consistent", () => {
  const model = deriveHcmProgression(28, 75, 8, 95, 105);

  assert.ok(
    Math.abs(
      model.totalStrokeVolume -
        model.regurgitantVolume -
        model.forwardStrokeVolume,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      ((model.endDiastolicVolume - model.endSystolicVolume) /
        model.endDiastolicVolume) *
        100 -
        model.ejectionFraction,
    ) < 1e-9,
  );
  assert.ok(model.mitralRegurgitantFraction > 0);
});

test("builds a basal-septal ECG with high voltage, narrow Q and lateral strain", () => {
  const lowQ = hcmEcgValue(0.286, 60, "V5", 0.05);
  const highQ = hcmEcgValue(0.286, 60, "V5", 0.9);
  const lowR = hcmEcgValue(0.31, 60, "V5", 0.05);
  const highR = hcmEcgValue(0.31, 60, "V5", 0.9);
  const lowT = hcmEcgValue(0.59, 60, "V5", 0.05);
  const highT = hcmEcgValue(0.59, 60, "V5", 0.9);
  const inferiorLowQ = hcmEcgValue(0.286, 60, "DII", 0.05);
  const inferiorHighQ = hcmEcgValue(0.286, 60, "DII", 0.9);

  assert.ok(highQ < lowQ);
  assert.ok(highR > lowR);
  assert.ok(highT < 0 && highT < lowT);
  assert.ok(highT > -0.7, "basal-septal HCM should not mimic giant apical T waves");
  assert.ok(inferiorHighQ < inferiorLowQ);
});

test("connects HCM mechanics without treating LDL as a causal modifier", () => {
  const disease = getDisease("hcm");
  const baseline = deriveSimulation(DEFAULT_VITALS, disease, 60, 24, 5);
  const highLdl = deriveSimulation(
    { ...DEFAULT_VITALS, ldl: 240 },
    disease,
    60,
    24,
    5,
  );

  assert.equal(baseline.strokeVolume, baseline.hcm.forwardStrokeVolume);
  assert.equal(baseline.ejectionFraction, baseline.hcm.ejectionFraction);
  assert.equal(baseline.contractility, baseline.hcm.contractility);
  assert.equal(baseline.riskIndex, highLdl.riskIndex);
  assert.equal(baseline.hcm.lvotGradient, highLdl.hcm.lvotGradient);
  assert.ok(!highLdl.activeRisks.includes("LDL crónico"));
});

test("wires septal thickening, SAM, turbulent LVOT flow, MR and ECG", async () => {
  const [heartScene, ecgMonitor, cardioLab] = await Promise.all([
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(heartScene, /hcmSeptum/);
  assert.match(heartScene, /hcmSamLeaflet/);
  assert.match(heartScene, /hcmLvotFlow/);
  assert.match(heartScene, /hcmMitralFlow/);
  assert.match(heartScene, /systolicAnteriorMotion/);
  assert.match(ecgMonitor, /hcmEcgValue/);
  assert.match(cardioLab, /Fenotipo obstructivo integrado/);
  assert.match(cardioLab, /EACVI 2025 · Imagen multimodal en MCH/);
});
