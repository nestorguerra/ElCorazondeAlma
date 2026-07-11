import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_VITALS,
  DISEASES,
  deriveSimulation,
  getDisease,
} from "../app/simulation.ts";

test("starts from an explicit healthy physiological reference", () => {
  const healthy = getDisease("healthy");
  const simulation = deriveSimulation(DEFAULT_VITALS, healthy, 0, 0, 0);

  assert.equal(DISEASES.length, 11);
  assert.equal(DISEASES[0].id, "healthy");
  assert.equal(healthy.pattern, "healthy");
  assert.equal(simulation.severity, 0);
  assert.equal(simulation.contractility, 1);
  assert.ok(simulation.ejectionFraction >= 60);
  assert.equal(simulation.rhythmIrregularity, 0);
});

test("reduces the visible clinical inputs to four essential conditions", async () => {
  const cardioLab = await readFile(
    new URL("../app/CardioLab.tsx", import.meta.url),
    "utf8",
  );

  assert.match(cardioLab, /label="Frecuencia basal"/);
  assert.match(cardioLab, /Presión arterial/);
  assert.match(cardioLab, /label="SpO₂"/);
  assert.match(cardioLab, /label="Temperatura"/);
  assert.doesNotMatch(cardioLab, /label="LDL"/);
  assert.doesNotMatch(cardioLab, /label="Viscosidad relativa"/);
});

test("uses one disease-severity control and keeps clinical detail as read-only output", async () => {
  const cardioLab = await readFile(
    new URL("../app/CardioLab.tsx", import.meta.url),
    "utf8",
  );
  const sliders = cardioLab.match(/className="inspector-slider"/g) ?? [];

  assert.equal(sliders.length, 1);
  assert.match(cardioLab, /severityToSpecific/);
  assert.match(cardioLab, /Gravedad del escenario/);
  assert.match(cardioLab, /disease\.specific\.label/);
});

test("ships the simplified professional header, themes and large lower explanation", async () => {
  const [cardioLab, styles, ecgMonitor] = await Promise.all([
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(cardioLab, /<h1>El Corazón de Alma<\/h1>/);
  assert.match(cardioLab, /Base médica/);
  assert.match(cardioLab, /Activar modo claro/);
  assert.match(cardioLab, /Restablecer simulación/);
  assert.match(cardioLab, /condition-explanation/);
  assert.match(cardioLab, /¿En qué consiste/);
  assert.match(cardioLab, /Movimiento y anatomía/);
  assert.match(cardioLab, /Qué ocurre en el ECG/);
  assert.match(styles, /:root\[data-theme="light"\]/);
  assert.match(styles, /\.right-rail \.lesson-module\s*{\s*display: none/);
  assert.match(styles, /\.condition-explanation h3[\s\S]{0,120}font-size: clamp\(22px/);
  assert.match(ecgMonitor, /theme: "dark" \| "light"/);
});
