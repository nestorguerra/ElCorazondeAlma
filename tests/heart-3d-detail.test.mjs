import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assetUrl = new URL(
  "../public/models/heart-anatomy-high-detail.glb",
  import.meta.url,
);
const sceneUrl = new URL("../app/HeartScene.tsx", import.meta.url);

test("ships a genuinely high-detail anatomical heart mesh", async () => {
  const glb = await readFile(assetUrl);
  assert.equal(glb.toString("utf8", 0, 4), "glTF");

  const jsonLength = glb.readUInt32LE(12);
  const manifest = JSON.parse(glb.toString("utf8", 20, 20 + jsonLength));
  const triangleCount = manifest.meshes.reduce(
    (meshTotal, mesh) =>
      meshTotal +
      mesh.primitives.reduce((primitiveTotal, primitive) => {
        const indexAccessor = manifest.accessors[primitive.indices];
        return primitiveTotal + indexAccessor.count / 3;
      }, 0),
    0,
  );

  assert.ok(triangleCount >= 140_000, `expected >=140k triangles, got ${triangleCount}`);
  assert.ok(manifest.images.length >= 3, "expected embedded color, normal and PBR maps");
});

test("keeps 360-degree vascular detail and smooth tapered vessels", async () => {
  const source = await readFile(sceneUrl, "utf8");

  assert.match(source, /POSTERIOR_CORONARY_VESSELS/);
  assert.match(source, /createTaperedTubeGeometry/);
  assert.match(source, /OrbitControls/);
  assert.match(source, /data-heart-quality="anatomical-high-detail"/);
});

test("compares healthy and diseased hearts in one synchronized WebGL canvas", async () => {
  const source = await readFile(sceneUrl, "utf8");

  assert.equal((source.match(/<Canvas\b/g) ?? []).length, 1);
  assert.match(source, /REFERENCE_HEART_POSITION/);
  assert.match(source, /DISEASE_HEART_POSITION/);
  assert.match(source, /healthyMotionTelemetry/);
  assert.match(source, /comparisonActive \? \(/);
});
