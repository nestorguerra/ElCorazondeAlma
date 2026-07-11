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

test("uses the disease-specific clinical parameter instead of a generic severity slider", async () => {
  const [cardioLab, scenarioBar, scenario] = await Promise.all([
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ScenarioBar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scenario.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(cardioLab, /className="inspector-slider"/);
  assert.match(cardioLab, /specificToSeverity/);
  assert.match(scenarioBar, /disease\.specific\.label/);
  assert.match(scenarioBar, /config\.kind === "discrete"/);
  assert.match(scenario, /Índice didáctico de variabilidad/);
  assert.match(scenario, /Expresión didáctica del patrón ECG/);
});

test("ships the simplified professional header, themes and large lower explanation", async () => {
  const [cardioLab, styles, ecgMonitor, scenarioBar, guidedLesson] = await Promise.all([
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/EcgMonitor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ScenarioBar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/GuidedLesson.tsx", import.meta.url), "utf8"),
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
  assert.match(ecgMonitor, /healthySimulation/);
  assert.match(ecgMonitor, /ecg-comparison-legend/);
  assert.match(scenarioBar, /Clase guiada/);
  assert.match(scenarioBar, /Comparar sano/);
  assert.match(guidedLesson, /Observa/);
  assert.match(guidedLesson, /Modifica/);
  assert.match(guidedLesson, /Interpreta/);
});

test("hardens the full simulator for iPad portrait, landscape and touch", async () => {
  const [cardioLab, heartScene, styles] = await Promise.all([
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HeartScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(cardioLab, /max-width: 1180px.*pointer: coarse/);
  assert.match(cardioLab, /aria-label="Base médica"/);
  assert.match(cardioLab, /typeof workspaceRef\.current\.requestFullscreen/);
  assert.match(heartScene, /tabletOptimized \? \[1, 1\.35\] : \[1, 1\.7\]/);
  assert.match(styles, /iPad and touch-tablet hardening/);
  assert.match(styles, /@media \(max-width: 1180px\)[\s\S]*?\.lab-grid\s*{\s*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /\.scenario-actions button,[\s\S]*?min-height: 44px/);
  assert.match(styles, /@media \(hover: none\) and \(pointer: coarse\)/);
});
