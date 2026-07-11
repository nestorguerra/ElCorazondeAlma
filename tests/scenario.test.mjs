import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SCENARIO,
  getDiseaseControlConfig,
  getScenarioLandmarks,
  normalizeSpecificValue,
  parseScenarioSearch,
  serializeScenarioSearch,
  specificToSeverity,
} from "../app/scenario.ts";
import { DISEASES, getDisease } from "../app/simulation.ts";

test("provides a usable adaptive control for every disease", () => {
  for (const disease of DISEASES) {
    const config = getDiseaseControlConfig(disease);
    assert.ok(config.kind === "continuous" || config.kind === "discrete");
    if (disease.id !== "healthy") {
      const landmarks = getScenarioLandmarks(disease);
      assert.equal(landmarks.length, 3);
      for (const landmark of landmarks) {
        assert.ok(landmark.value >= disease.specific.min);
        assert.ok(landmark.value <= disease.specific.max);
      }
    }
  }
});

test("uses four categorical states for AV block", () => {
  const config = getDiseaseControlConfig(getDisease("av-block"));
  assert.equal(config.kind, "discrete");
  assert.deepEqual(config.options?.map((option) => option.value), [1, 2, 3, 4]);
  assert.match(config.options?.[3].label ?? "", /completo/i);
});

test("maps inverse clinical measurements to increasing severity", () => {
  const heartFailure = getDisease("heart-failure");
  const stenosis = getDisease("aortic-stenosis");

  assert.equal(specificToSeverity(heartFailure, 40), 0);
  assert.equal(specificToSeverity(heartFailure, 15), 100);
  assert.equal(specificToSeverity(stenosis, 1.8), 0);
  assert.equal(specificToSeverity(stenosis, 0.7), 100);
});

test("rounds and clamps disease-specific values", () => {
  const stenosis = getDisease("aortic-stenosis");
  assert.equal(normalizeSpecificValue(stenosis, 1.26), 1.3);
  assert.equal(normalizeSpecificValue(stenosis, 9), 1.8);
  assert.equal(normalizeSpecificValue(stenosis, -2), 0.7);
});

test("round-trips a complete shareable scenario", () => {
  const state = {
    ...DEFAULT_SCENARIO,
    diseaseId: "hcm",
    specificValue: 27,
    vitals: {
      ...DEFAULT_SCENARIO.vitals,
      heartRate: 118,
      systolic: 96,
      diastolic: 62,
      spo2: 91,
      temperature: 38.2,
    },
    lead: "V5",
    compareHealthy: true,
    mode: "guided",
    guidedStep: 3,
  };

  const restored = parseScenarioSearch(`?${serializeScenarioSearch(state)}`);
  assert.deepEqual(restored, state);
});

test("sanitizes malformed links and rejects incompatible versions", () => {
  const malformed = parseScenarioSearch(
    "?v=1&d=aortic-stenosis&x=-9&hr=999&sys=80&dia=125&spo2=2&temp=x&lead=XYZ&compare=1&mode=guided&step=99",
  );
  assert.equal(malformed.specificValue, 0.7);
  assert.equal(malformed.vitals.heartRate, 160);
  assert.ok(malformed.vitals.systolic >= malformed.vitals.diastolic + 15);
  assert.equal(malformed.vitals.spo2, 78);
  assert.equal(malformed.lead, "DII");
  assert.equal(malformed.guidedStep, 3);

  const incompatible = parseScenarioSearch("?v=99&d=hcm&x=35&compare=1");
  assert.deepEqual(incompatible, {
    ...DEFAULT_SCENARIO,
    vitals: { ...DEFAULT_SCENARIO.vitals },
  });
});

