import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { computeCardiacMotion } from "../app/heartMotion.ts";
import {
  deriveInfarctionProgression,
  infarctionComplex,
} from "../app/infarctionModel.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("evolves from hyperacute T waves to ST injury and pathological Q waves", () => {
  const early = deriveInfarctionProgression(100, 0, 70);
  const acute = deriveInfarctionProgression(100, 15, 70);
  const evolving = deriveInfarctionProgression(100, 50, 70);
  const late = deriveInfarctionProgression(100, 90, 70);

  assert.equal(early.stage, "hyperacute");
  assert.equal(acute.stage, "acute-injury");
  assert.equal(evolving.stage, "evolving");
  assert.equal(late.stage, "established-necrosis");
  assert.ok(early.hyperacuteT > acute.hyperacuteT);
  assert.equal(early.stElevation, 0);
  assert.ok(acute.stElevation > 0.65);
  assert.equal(early.qWave, 0);
  assert.ok(late.qWave > evolving.qWave);
  assert.ok(late.necrosisFraction > 0.8);
});

test("localizes anterior STEMI to V2/V5 with reciprocal DII depression", () => {
  const acute = deriveInfarctionProgression(100, 18, 70);
  const v2St = infarctionComplex(0.27, "V2", acute);
  const v5St = infarctionComplex(0.27, "V5", acute);
  const diiSt = infarctionComplex(0.27, "DII", acute);

  assert.ok(v2St > 0.35);
  assert.ok(v5St > 0.18);
  assert.ok(v2St > v5St);
  assert.ok(diiSt < -0.08);
});

test("preserves an upright T wave during persistent occlusion while R is lost and Q develops", () => {
  const early = deriveInfarctionProgression(100, 0, 70);
  const late = deriveInfarctionProgression(100, 90, 70);

  assert.ok(infarctionComplex(0.37, "V2", early) > 0.7);
  assert.ok(infarctionComplex(0.39, "V2", late) > 0);
  assert.ok(infarctionComplex(0.145, "V2", late) < -0.45);
  assert.ok(
    infarctionComplex(0.164, "V2", late) <
      infarctionComplex(0.164, "V2", early) * 0.35,
  );
});

test("makes regional dysfunction immediate and necrosis time-dependent", () => {
  const early = deriveInfarctionProgression(100, 0, 70);
  const late = deriveInfarctionProgression(100, 90, 70);
  assert.ok(early.wallMotionLoss >= 0.45);
  assert.equal(early.necrosisFraction, 0);
  assert.ok(late.wallMotionLoss > 0.9);
  assert.ok(late.regionalDyskinesia > 0.05);

  const motion = computeCardiacMotion({
    phase: 0.2,
    beatIndex: 0,
    diseaseId: "infarction",
    severity: 0.8,
    contractility: 0.82,
    infarctionWallMotionLoss: late.wallMotionLoss,
    infarctionDyskinesia: late.regionalDyskinesia,
  });
  assert.equal(motion.regionalDysfunction, late.wallMotionLoss);
  assert.equal(motion.regionalDyskinesia, late.regionalDyskinesia);
});

test("separates acute occlusion and elapsed injury from chronic LDL risk", () => {
  const disease = getDisease("infarction");
  const early = deriveSimulation(DEFAULT_VITALS, disease, 70, 100, 0);
  const highLdl = deriveSimulation(
    { ...DEFAULT_VITALS, ldl: 220 },
    disease,
    70,
    100,
    0,
  );
  const late = deriveSimulation(DEFAULT_VITALS, disease, 70, 100, 90);

  assert.equal(early.infarction.necrosisFraction, 0);
  assert.equal(early.severity, highLdl.severity);
  assert.equal(early.ejectionFraction, highLdl.ejectionFraction);
  assert.ok(late.infarction.necrosisFraction > early.infarction.necrosisFraction);
  assert.ok(late.ejectionFraction < early.ejectionFraction);
  assert.ok(late.strokeVolume < early.strokeVolume);
});

test("wires staged infarction ECG, core-border mechanics and LAD occlusion", async () => {
  const [ecg, heart] = await Promise.all([
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(ecg, /infarctionEcgValue/);
  assert.match(ecg, /runtimeRef/);
  assert.match(ecg, /\}, \[motionTelemetry\]\);/);
  assert.doesNotMatch(ecg, /pattern === "infarction"\) \{\s+const regional/);
  assert.match(heart, /uInfarctionMode/);
  assert.match(heart, /uNecrosisFraction/);
  assert.match(heart, /infarctCoreMask/);
  assert.match(heart, /infarctBorderMask/);
  assert.match(heart, /regionalDyskinesia/);
  assert.match(heart, /Oclusión|occlusiveLoad/);
});
