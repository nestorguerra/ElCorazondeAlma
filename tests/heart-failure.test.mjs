import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveHeartFailureProgression,
  heartFailureComplex,
} from "../app/heartFailureModel.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("derives LVEF from internally consistent end-diastolic and end-systolic volumes", () => {
  const model = deriveHeartFailureProgression(35, 44, 0);
  const calculatedEf =
    ((model.endDiastolicVolume - model.endSystolicVolume) /
      model.endDiastolicVolume) *
    100;

  assert.ok(Math.abs(calculatedEf - model.ejectionFraction) < 1e-9);
  assert.ok(
    Math.abs(
      model.strokeVolume -
        (model.endDiastolicVolume - model.endSystolicVolume),
    ) < 1e-9,
  );
  assert.equal(model.ejectionFraction, 35);
  assert.ok(model.endSystolicVolume > model.strokeVolume);
});

test("progresses toward greater dilation, residual volume and systolic dysfunction", () => {
  const initial = deriveHeartFailureProgression(32, 60, 0);
  const later = deriveHeartFailureProgression(32, 60, 36);
  const severe = deriveHeartFailureProgression(15, 100, 36);

  assert.ok(later.ejectionFraction < initial.ejectionFraction);
  assert.ok(later.dilationFraction > initial.dilationFraction);
  assert.ok(later.endSystolicVolume > initial.endSystolicVolume);
  assert.ok(later.residualVolumeFraction > initial.residualVolumeFraction);
  assert.equal(severe.stage, "severe-systolic-dysfunction");
  assert.ok(severe.endSystolicVolume >= 150);
  assert.ok(severe.contractility < later.contractility);
});

test("preserves volume arithmetic while afterload and tachycardia reduce forward stroke volume", () => {
  const baseline = deriveHeartFailureProgression(35, 55, 0, 0, 72);
  const stressed = deriveHeartFailureProgression(35, 55, 0, 1, 145);

  assert.ok(stressed.ejectionFraction < baseline.ejectionFraction);
  assert.ok(stressed.endDiastolicVolume < baseline.endDiastolicVolume);
  assert.ok(stressed.strokeVolume < baseline.strokeVolume);
  assert.ok(
    Math.abs(
      stressed.strokeVolume -
        (stressed.endDiastolicVolume - stressed.endSystolicVolume),
    ) < 1e-9,
  );
});

test("uses a narrow-QRS nonspecific ECG phenotype that does not encode LVEF", () => {
  const diiR = heartFailureComplex(0.164, "DII");
  const v2R = heartFailureComplex(0.164, "V2");
  const v5T = heartFailureComplex(0.39, "V5");
  const diiT = heartFailureComplex(0.39, "DII");
  const v5St = heartFailureComplex(0.25, "V5");

  assert.ok(v2R < diiR * 0.35, "V2 should show poor R-wave progression");
  assert.ok(v5T < diiT, "lateral T wave should be flattened");
  assert.ok(v5St < -0.02, "V5 should have only a subtle nonspecific ST change");
  assert.ok(Math.abs(heartFailureComplex(0.12, "DII")) < 0.02);
  assert.ok(Math.abs(heartFailureComplex(0.22, "DII")) < 0.02);
});

test("connects selected LVEF to global motion, volumes and forward output", () => {
  const disease = getDisease("heart-failure");
  const moderate = deriveSimulation(DEFAULT_VITALS, disease, 44, 35, 0);
  const severe = deriveSimulation(DEFAULT_VITALS, disease, 90, 15, 36);

  assert.equal(moderate.ejectionFraction, moderate.heartFailure.ejectionFraction);
  assert.equal(moderate.strokeVolume, moderate.heartFailure.strokeVolume);
  assert.ok(severe.ejectionFraction < moderate.ejectionFraction);
  assert.ok(severe.contractility < moderate.contractility);
  assert.ok(
    severe.heartFailure.dilationFraction >
      moderate.heartFailure.dilationFraction,
  );
  assert.ok(severe.cardiacOutput < moderate.cardiacOutput);
});

test("does not let chronic LDL directly change the HFrEF phenotype", () => {
  const disease = getDisease("heart-failure");
  const baseline = deriveSimulation(DEFAULT_VITALS, disease, 55, 30, 12);
  const highLdl = deriveSimulation(
    { ...DEFAULT_VITALS, ldl: 220 },
    disease,
    55,
    30,
    12,
  );

  assert.deepEqual(highLdl.heartFailure, baseline.heartFailure);
  assert.equal(highLdl.ejectionFraction, baseline.ejectionFraction);
  assert.equal(highLdl.strokeVolume, baseline.strokeVolume);
});

test("wires global dilation and a fixed nonspecific ECG rather than an invented HF trace", async () => {
  const [ecg, heart, simulation] = await Promise.all([
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/simulation.ts", import.meta.url), "utf8"),
  ]);

  assert.match(ecg, /heartFailureEcgValue\(time, safeRate, lead\)/);
  assert.doesNotMatch(ecg, /value \*= 1 - severity01 \* 0\.18/);
  assert.match(heart, /simulation\.heartFailure\.dilationFraction/);
  assert.match(heart, /dilation \* 0\.18/);
  assert.match(simulation, /heartFailure\.contractility/);
  assert.match(simulation, /heartFailure\.strokeVolume/);
});
