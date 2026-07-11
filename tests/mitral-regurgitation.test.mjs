import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  deriveMitralRegurgitationProgression,
  mitralRegurgitationEcgValue,
} from "../app/mitralRegurgitationModel.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("grades chronic primary MR with concordant RF, RVol and EROA", () => {
  const mild = deriveMitralRegurgitationProgression(10, 20, 0, 72, 118);
  const moderate = deriveMitralRegurgitationProgression(30, 40, 3, 72, 118);
  const moderateHigh = deriveMitralRegurgitationProgression(40, 55, 6, 72, 118);
  const severe = deriveMitralRegurgitationProgression(50, 70, 9, 72, 118);

  assert.equal(mild.stage, "mild");
  assert.ok(mild.regurgitantVolume < 30);
  assert.ok(mild.effectiveRegurgitantOrificeArea < 0.2);
  assert.equal(moderate.stage, "moderate");
  assert.ok(moderate.regurgitantVolume >= 30);
  assert.equal(moderateHigh.stage, "moderate-high");
  assert.equal(severe.stage, "severe");
  assert.ok(severe.regurgitantVolume >= 60);
  assert.ok(severe.effectiveRegurgitantOrificeArea >= 0.4);
});

test("separates total LV emptying from regurgitant and useful aortic volume", () => {
  const model = deriveMitralRegurgitationProgression(50, 60, 7, 72, 118);

  assert.ok(
    Math.abs(
      model.totalStrokeVolume -
        model.regurgitantVolume -
        model.forwardStrokeVolume,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      model.regurgitantVolume / model.totalStrokeVolume -
        model.regurgitantFraction,
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
  assert.ok(model.totalStrokeVolume > model.forwardStrokeVolume);
  assert.ok(model.ejectionFraction >= 60);
});

test("chronic volume overload dilates LA and LV while compensated EF stays preserved", () => {
  const early = deriveMitralRegurgitationProgression(38, 10, 0, 72, 118);
  const chronic = deriveMitralRegurgitationProgression(38, 90, 12, 72, 118);

  assert.ok(chronic.leftAtrialDilation > early.leftAtrialDilation);
  assert.ok(chronic.leftVentricularDilation > early.leftVentricularDilation);
  assert.ok(chronic.endDiastolicVolume > early.endDiastolicVolume);
  assert.ok(chronic.ejectionFraction >= 60);
  assert.ok(chronic.contractility >= 0.99);
});

test("does not use jet velocity as a surrogate for regurgitation severity", () => {
  const mild = deriveMitralRegurgitationProgression(10, 20, 1, 72, 118);
  const severe = deriveMitralRegurgitationProgression(60, 80, 10, 72, 118);

  assert.ok(mild.regurgitantJetVelocity >= 4 && mild.regurgitantJetVelocity <= 6);
  assert.ok(
    severe.regurgitantJetVelocity >= 4 &&
      severe.regurgitantJetVelocity <= 6,
  );
  assert.ok(
    Math.abs(mild.regurgitantJetVelocity - severe.regurgitantJetVelocity) < 1,
  );
  assert.ok(severe.regurgitantVolume > mild.regurgitantVolume * 8);
});

test("makes P-wave and QRS clues depend on chamber remodeling", () => {
  const lowLateP = mitralRegurgitationEcgValue(0.19, 60, "DII", 0.1, 0.1);
  const highLateP = mitralRegurgitationEcgValue(0.19, 60, "DII", 0.9, 0.1);
  const lowTerminalP = mitralRegurgitationEcgValue(0.193, 60, "V2", 0.1, 0.1);
  const highTerminalP = mitralRegurgitationEcgValue(0.193, 60, "V2", 0.9, 0.1);
  const lowR = mitralRegurgitationEcgValue(0.31, 60, "V5", 0.1, 0.1);
  const highR = mitralRegurgitationEcgValue(0.31, 60, "V5", 0.1, 0.9);

  assert.ok(highLateP > lowLateP);
  assert.ok(highTerminalP < lowTerminalP);
  assert.ok(highR > lowR);
});

test("connects forward output and total EF without LDL changing primary MR", () => {
  const disease = getDisease("mitral-regurgitation");
  const baseline = deriveSimulation(DEFAULT_VITALS, disease, 55, 50, 7);
  const highLdl = deriveSimulation(
    { ...DEFAULT_VITALS, ldl: 240 },
    disease,
    55,
    50,
    7,
  );

  assert.equal(baseline.mitralRegurgitation.stage, "severe");
  assert.equal(
    baseline.strokeVolume,
    baseline.mitralRegurgitation.forwardStrokeVolume,
  );
  assert.equal(
    baseline.ejectionFraction,
    baseline.mitralRegurgitation.ejectionFraction,
  );
  assert.equal(baseline.riskIndex, highLdl.riskIndex);
  assert.equal(
    baseline.mitralRegurgitation.regurgitantVolume,
    highLdl.mitralRegurgitation.regurgitantVolume,
  );
});

test("wires leaflet coaptation, bidirectional flow, chamber dilation and ECG", async () => {
  const [heartScene, ecgMonitor, cardioLab] = await Promise.all([
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(heartScene, /mitralValveLeaflets/);
  assert.match(heartScene, /coaptationGapFraction/);
  assert.match(heartScene, /mitralForwardFlow/);
  assert.match(heartScene, /backFlow/);
  assert.match(heartScene, /mitralLvDilation/);
  assert.match(heartScene, /mitralLaDilation/);
  assert.match(ecgMonitor, /mitralRegurgitationEcgValue/);
  assert.doesNotMatch(
    ecgMonitor,
    /pattern === "mitral-regurgitation"[\s\S]{0,180}severity01/,
  );
  assert.match(cardioLab, /Volumen aórtico útil/);
  assert.match(cardioLab, /Grado integrado de IM/);
  assert.match(cardioLab, /ASE\/SCMR/);
});
