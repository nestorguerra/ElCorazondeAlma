import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { computeCardiacMotion } from "../app/heartMotion.ts";

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
  const normalAtria = computeCardiacMotion({ ...baseInput, phase: 0.86 });
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

  assert.ok(afib.atrial < normalAtria.atrial * 0.4);
  assert.ok(afib.atrialFlutter > 0.8);
  assert.ok(infarction.regionalDysfunction > ischemia.regionalDysfunction);
  assert.equal(blocked.skipped, true);
  assert.equal(blocked.ventricular, 0);
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
});
