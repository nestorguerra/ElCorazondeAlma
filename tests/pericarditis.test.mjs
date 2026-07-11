import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  derivePericarditisProgression,
  pericarditisEcgValue,
} from "../app/pericarditisModel.ts";
import {
  DEFAULT_VITALS,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("follows the classic four-stage ECG sequence in chronological order", () => {
  const stageI = derivePericarditisProgression(80, 100, 1);
  const stageII = derivePericarditisProgression(80, 100, 5);
  const stageIII = derivePericarditisProgression(80, 100, 11);
  const stageIV = derivePericarditisProgression(80, 100, 30);

  assert.equal(stageI.stage, "stage-i-injury");
  assert.ok(stageI.stElevation > 0);
  assert.ok(stageI.prDepression > 0);
  assert.equal(stageI.tInversion, 0);

  assert.equal(stageII.stage, "stage-ii-normalizing");
  assert.ok(stageII.stElevation < stageI.stElevation);
  assert.ok(stageII.tWaveScale < stageI.tWaveScale);
  assert.equal(stageIII.stage, "stage-iii-t-inversion");
  assert.equal(stageIII.stElevation, 0);
  assert.equal(stageIII.prDepression, 0);
  assert.ok(stageIII.tInversion > 0);

  assert.equal(stageIV.stage, "stage-iv-recovery");
  assert.ok(stageIV.tInversion < stageIII.tInversion);
});

test("creates concordant diffuse stage-I ST elevation and PR depression", () => {
  const stageI = derivePericarditisProgression(90, 100, 1);
  const silent = derivePericarditisProgression(90, 0, 1);

  for (const lead of ["DII", "V2", "V5"]) {
    const expressedPr = pericarditisEcgValue(0.23, 60, lead, stageI);
    const normalPr = pericarditisEcgValue(0.23, 60, lead, silent);
    const expressedSt = pericarditisEcgValue(0.44, 60, lead, stageI);
    const normalSt = pericarditisEcgValue(0.44, 60, lead, silent);

    assert.ok(expressedPr < normalPr, `${lead} should depress the PR segment`);
    assert.ok(expressedSt > normalSt, `${lead} should elevate the ST segment`);
  }
});

test("inverts T only after ST has returned to baseline", () => {
  const stageI = derivePericarditisProgression(90, 100, 1);
  const stageIII = derivePericarditisProgression(90, 100, 11);
  const silentStageIII = derivePericarditisProgression(90, 0, 11);

  for (const lead of ["DII", "V2", "V5"]) {
    assert.ok(pericarditisEcgValue(0.59, 60, lead, stageI) > 0);
    assert.ok(pericarditisEcgValue(0.59, 60, lead, stageIII) < 0);
    assert.equal(stageIII.stElevation, 0);
    assert.ok(pericarditisEcgValue(0.44, 60, lead, stageIII) -
      pericarditisEcgValue(0.44, 60, lead, silentStageIII) < 1e-9);
  }
});

test("allows acute pericarditis to have a non-diagnostic ECG", () => {
  const inflamed = derivePericarditisProgression(95, 0, 1);
  const minimallyInflamed = derivePericarditisProgression(10, 0, 1);

  assert.ok(inflamed.inflammationFraction > minimallyInflamed.inflammationFraction);
  assert.equal(inflamed.stElevation, 0);
  assert.equal(inflamed.prDepression, 0);
  assert.equal(
    pericarditisEcgValue(0.44, 60, "DII", inflamed),
    pericarditisEcgValue(0.44, 60, "DII", minimallyInflamed),
  );
});

test("preserves myocardial mechanics in uncomplicated pericarditis", () => {
  const disease = getDisease("pericarditis");
  const lowExpression = deriveSimulation(DEFAULT_VITALS, disease, 90, 0, 1);
  const classicExpression = deriveSimulation(DEFAULT_VITALS, disease, 90, 100, 1);

  assert.equal(classicExpression.pericarditis.effusionFraction, 0);
  assert.equal(classicExpression.pericarditis.myocardialRestriction, 0);
  assert.equal(classicExpression.contractility, 1);
  assert.equal(classicExpression.ejectionFraction, 64);
  assert.equal(classicExpression.strokeVolume, lowExpression.strokeVolume);
  assert.equal(classicExpression.stability, "Compensado");
});

test("wires staged ECG and visible inflammation without fake constriction", async () => {
  const [heartScene, ecgMonitor, cardioLab] = await Promise.all([
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(ecgMonitor, /pericarditisEcgValue/);
  assert.match(heartScene, /pericardialVisibility/);
  assert.match(heartScene, /inflammatoryShimmer/);
  assert.doesNotMatch(heartScene, /restrictedMotion/);
  assert.match(cardioLab, /Fase ECG y pericárdica/);
  assert.match(cardioLab, /Contracción miocárdica conservada/);
  assert.match(cardioLab, /ESC 2025 · Guía de miocarditis y pericarditis/);
});
