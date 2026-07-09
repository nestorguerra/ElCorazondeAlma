import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders El Corazón de Alma and its educational safeguards", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>El Corazón de Alma/);
  assert.match(html, /Simulación educativa/);
  assert.match(html, /Fibrilación auricular/);
  assert.match(html, /ECG sintético/);
  assert.match(html, /no diagnostica/i);
});

test("ships the simulator without the disposable starter preview", async () => {
  const [page, layout, cardioLab, simulation, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CardioLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/simulation.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<CardioLab \/>/);
  assert.match(layout, /lang="es"/);
  assert.match(layout, /Simulador educativo de cardiología/);
  assert.match(cardioLab, /DISEASES\.map/);
  assert.match(cardioLab, /Modelo didáctico simplificado/);
  assert.match(simulation, /Fibrilación auricular/);
  assert.match(simulation, /Pericarditis aguda/);
  assert.match(packageJson, /"three"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
});
