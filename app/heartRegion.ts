export type Point3 = [number, number, number];

export const HEART_MODEL_SCALE = 4.5;

// Coordinates in the original NIH mesh, before its 180° Y rotation and scale.
export const ANTEROLATERAL_REGION_MODEL: Point3 = [-0.095, -0.11, -0.187];

export function modelPointToHeartScene([x, y, z]: Point3): Point3 {
  // The anatomical primitive is rotated π radians around Y and then scaled.
  return [
    -x * HEART_MODEL_SCALE,
    y * HEART_MODEL_SCALE,
    -z * HEART_MODEL_SCALE,
  ];
}

export const ANTEROLATERAL_REGION_SCENE = modelPointToHeartScene(
  ANTEROLATERAL_REGION_MODEL,
);
