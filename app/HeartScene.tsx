"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import * as THREE from "three";
import {
  computeCardiacMotion,
  type HeartMotionTelemetry,
} from "./heartMotion";
import type { Disease, DerivedSimulation } from "./simulation";

type HeartSceneProps = {
  disease: Disease;
  simulation: DerivedSimulation;
  paused: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  motionTelemetry: HeartMotionTelemetry;
};

type Point3 = [number, number, number];

type VesselDefinition = {
  points: Point3[];
  radius: number;
  color: string;
  emissive?: string;
  opacity?: number;
};

type NumericUniform = { value: number };

type HeartMotionUniforms = {
  uTime: NumericUniform;
  uVentricularSystole: NumericUniform;
  uAtrialSystole: NumericUniform;
  uContractility: NumericUniform;
  uTwist: NumericUniform;
  uAtrialFlutter: NumericUniform;
  uDyssynchrony: NumericUniform;
  uRegionalDysfunction: NumericUniform;
  uRegionalCenter: { value: THREE.Vector3 };
  uRegionalRadius: NumericUniform;
};

function createHeartMotionUniforms(): HeartMotionUniforms {
  return {
    uTime: { value: 0 },
    uVentricularSystole: { value: 0 },
    uAtrialSystole: { value: 0 },
    uContractility: { value: 1 },
    uTwist: { value: 0.1 },
    uAtrialFlutter: { value: 0 },
    uDyssynchrony: { value: 0 },
    uRegionalDysfunction: { value: 0 },
    uRegionalCenter: { value: new THREE.Vector3(-0.095, -0.11, -0.187) },
    uRegionalRadius: { value: 0.23 },
  };
}

function addRegionalHeartMotion(
  material: THREE.MeshStandardMaterial,
  uniforms: HeartMotionUniforms,
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uVentricularSystole;
uniform float uAtrialSystole;
uniform float uContractility;
uniform float uTwist;
uniform float uAtrialFlutter;
uniform float uDyssynchrony;
uniform float uRegionalDysfunction;
uniform vec3 uRegionalCenter;
uniform float uRegionalRadius;`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
float heartY = clamp(position.y + 0.5, 0.0, 1.0);
float ventricularMask = 1.0 - smoothstep(0.62, 0.84, heartY);
float atrialMask = smoothstep(0.57, 0.69, heartY) *
  (1.0 - smoothstep(0.86, 0.98, heartY));
float apexBias = 1.0 - smoothstep(0.18, 0.72, heartY);
float regionalDistance = distance(position, uRegionalCenter);
float regionalMask = 1.0 - smoothstep(
  uRegionalRadius * 0.48,
  uRegionalRadius,
  regionalDistance
);
float localContractility = mix(
  1.0,
  1.0 - uRegionalDysfunction,
  regionalMask
);
float ventricularForce = uVentricularSystole * uContractility *
  localContractility * ventricularMask;
float radialCompression = ventricularForce * (0.052 + apexBias * 0.034);
transformed.xz *= 1.0 - radialCompression;
transformed.y += ventricularForce * (0.012 + apexBias * 0.018);

float twistAngle = uTwist * ventricularForce * (0.67 - heartY);
float twistCos = cos(twistAngle);
float twistSin = sin(twistAngle);
transformed.xz = mat2(twistCos, -twistSin, twistSin, twistCos) * transformed.xz;

float atrialForce = uAtrialSystole * uContractility * atrialMask;
transformed.xz *= 1.0 - atrialForce * 0.082;
transformed.y -= atrialForce * 0.012;

vec3 radialDirection = normalize(
  vec3(position.x, 0.08, position.z) + vec3(0.0001)
);
float atrialRipple = sin(
  uTime * 25.0 + position.x * 68.0 + position.z * 54.0
) * uAtrialFlutter * atrialMask;
transformed += radialDirection * atrialRipple * 0.007;

float ventricularRipple = sin(
  uTime * 19.0 + position.y * 43.0 + position.x * 34.0
) * uDyssynchrony * ventricularMask;
transformed += radialDirection * ventricularRipple * 0.009;`,
      );
  };
  material.customProgramCacheKey = () => "regional-heart-motion-v2";
  material.needsUpdate = true;
}

const subscribeToHydration = () => () => undefined;
const clientMountedSnapshot = () => true;
const serverMountedSnapshot = () => false;

const CORONARY_VESSELS: VesselDefinition[] = [
  {
    color: "#f12f2f",
    emissive: "#541010",
    radius: 0.043,
    points: [
      [0.05, 0.86, 0.92],
      [0.1, 0.54, 1.01],
      [0.12, 0.14, 1.07],
      [0.16, -0.34, 1.04],
      [0.2, -0.82, 0.92],
      [0.27, -1.25, 0.69],
      [0.31, -1.58, 0.37],
    ],
  },
  {
    color: "#ef3535",
    emissive: "#4c0d0d",
    radius: 0.037,
    points: [
      [-0.02, 0.83, 0.9],
      [-0.42, 0.75, 0.91],
      [-0.78, 0.51, 0.82],
      [-0.98, 0.16, 0.66],
      [-0.94, -0.2, 0.54],
    ],
  },
  {
    color: "#ef3434",
    emissive: "#4c0d0d",
    radius: 0.031,
    points: [
      [0.08, 0.57, 1.0],
      [-0.2, 0.39, 1.01],
      [-0.49, 0.17, 0.94],
      [-0.67, -0.13, 0.82],
    ],
  },
  {
    color: "#f13a38",
    emissive: "#4c0d0d",
    radius: 0.03,
    points: [
      [0.12, 0.3, 1.05],
      [0.44, 0.17, 1.0],
      [0.71, -0.03, 0.89],
      [0.9, -0.32, 0.7],
    ],
  },
  {
    color: "#ec3333",
    emissive: "#4c0d0d",
    radius: 0.027,
    points: [
      [0.15, -0.08, 1.05],
      [-0.12, -0.24, 1.02],
      [-0.4, -0.48, 0.9],
      [-0.55, -0.78, 0.72],
    ],
  },
  {
    color: "#ec3333",
    emissive: "#4c0d0d",
    radius: 0.025,
    points: [
      [0.18, -0.45, 0.99],
      [0.5, -0.59, 0.91],
      [0.74, -0.82, 0.74],
      [0.82, -1.08, 0.53],
    ],
  },
  {
    color: "#eb3434",
    emissive: "#4b0d0d",
    radius: 0.022,
    points: [
      [0.22, -0.78, 0.87],
      [-0.02, -0.93, 0.81],
      [-0.19, -1.16, 0.61],
    ],
  },
  {
    color: "#ef3535",
    emissive: "#4c0d0d",
    radius: 0.024,
    points: [
      [0.1, 0.48, 1.05],
      [0.39, 0.36, 1.06],
      [0.66, 0.17, 0.98],
      [0.86, -0.08, 0.82],
    ],
  },
  {
    color: "#ef3535",
    emissive: "#4c0d0d",
    radius: 0.022,
    points: [
      [0.14, -0.21, 1.07],
      [0.45, -0.34, 1.02],
      [0.72, -0.55, 0.9],
      [0.84, -0.79, 0.7],
    ],
  },
  {
    color: "#ee3434",
    emissive: "#4b0d0d",
    radius: 0.022,
    points: [
      [-0.08, 0.46, 1.06],
      [-0.36, 0.35, 1.07],
      [-0.65, 0.18, 1.0],
      [-0.86, -0.05, 0.85],
    ],
  },
  {
    color: "#ee3434",
    emissive: "#4b0d0d",
    radius: 0.021,
    points: [
      [0.03, -0.38, 1.04],
      [-0.25, -0.53, 1.02],
      [-0.49, -0.75, 0.91],
      [-0.61, -1.01, 0.7],
    ],
  },
  {
    color: "#4972c3",
    emissive: "#0a183e",
    radius: 0.038,
    points: [
      [-0.12, 0.82, 0.95],
      [-0.2, 0.5, 1.04],
      [-0.22, 0.12, 1.06],
      [-0.21, -0.31, 1.0],
      [-0.12, -0.78, 0.84],
      [0.04, -1.2, 0.59],
    ],
  },
  {
    color: "#456bb7",
    emissive: "#091635",
    radius: 0.031,
    points: [
      [-0.19, 0.72, 0.98],
      [-0.56, 0.69, 0.93],
      [-0.88, 0.47, 0.79],
      [-1.02, 0.12, 0.59],
    ],
  },
  {
    color: "#456bb7",
    emissive: "#091635",
    radius: 0.025,
    points: [
      [-0.21, 0.25, 1.04],
      [-0.48, 0.06, 0.96],
      [-0.7, -0.23, 0.8],
      [-0.76, -0.54, 0.64],
    ],
  },
  {
    color: "#456bb7",
    emissive: "#091635",
    radius: 0.023,
    points: [
      [-0.18, -0.28, 0.98],
      [0.09, -0.39, 1.02],
      [0.38, -0.55, 0.93],
      [0.57, -0.78, 0.77],
    ],
  },
  {
    color: "#456bb7",
    emissive: "#091635",
    radius: 0.021,
    points: [
      [-0.17, 0.38, 1.08],
      [0.08, 0.25, 1.09],
      [0.36, 0.06, 1.02],
      [0.54, -0.18, 0.9],
    ],
  },
  {
    color: "#456bb7",
    emissive: "#091635",
    radius: 0.02,
    points: [
      [-0.18, -0.43, 1.01],
      [-0.02, -0.64, 0.99],
      [0.14, -0.93, 0.83],
      [0.22, -1.2, 0.62],
    ],
  },
];

const POSTERIOR_CORONARY_VESSELS: VesselDefinition[] = [
  {
    color: "#e42d35",
    emissive: "#471015",
    radius: 0.035,
    points: [
      [0.04, 0.78, -0.92],
      [0.08, 0.39, -1.05],
      [0.12, -0.08, -1.09],
      [0.17, -0.58, -0.99],
      [0.22, -1.11, -0.74],
      [0.2, -1.48, -0.43],
    ],
  },
  {
    color: "#e53538",
    emissive: "#471015",
    radius: 0.03,
    points: [
      [-0.03, 0.76, -0.93],
      [-0.38, 0.67, -0.95],
      [-0.72, 0.48, -0.84],
      [-0.94, 0.17, -0.64],
      [-0.98, -0.13, -0.48],
    ],
  },
  {
    color: "#e53538",
    emissive: "#471015",
    radius: 0.024,
    points: [
      [0.08, 0.37, -1.05],
      [0.39, 0.22, -1.02],
      [0.66, -0.02, -0.88],
      [0.84, -0.32, -0.68],
    ],
  },
  {
    color: "#e53538",
    emissive: "#471015",
    radius: 0.022,
    points: [
      [0.12, -0.18, -1.08],
      [-0.17, -0.35, -1.02],
      [-0.4, -0.61, -0.87],
      [-0.52, -0.91, -0.66],
    ],
  },
  {
    color: "#e53538",
    emissive: "#471015",
    radius: 0.021,
    points: [
      [0.16, -0.54, -0.98],
      [0.46, -0.67, -0.9],
      [0.69, -0.88, -0.72],
      [0.79, -1.12, -0.5],
    ],
  },
  {
    color: "#4168b4",
    emissive: "#091632",
    radius: 0.037,
    points: [
      [-0.1, 0.78, -0.96],
      [-0.15, 0.39, -1.08],
      [-0.14, -0.08, -1.1],
      [-0.08, -0.56, -1.0],
      [0.05, -1.03, -0.77],
      [0.15, -1.39, -0.49],
    ],
  },
  {
    color: "#4168b4",
    emissive: "#091632",
    radius: 0.028,
    points: [
      [-0.15, 0.61, -1.01],
      [-0.49, 0.55, -0.96],
      [-0.77, 0.35, -0.82],
      [-0.91, 0.08, -0.63],
    ],
  },
  {
    color: "#4168b4",
    emissive: "#091632",
    radius: 0.023,
    points: [
      [-0.14, 0.16, -1.09],
      [0.16, 0.03, -1.1],
      [0.44, -0.18, -0.99],
      [0.62, -0.45, -0.82],
    ],
  },
  {
    color: "#4168b4",
    emissive: "#091632",
    radius: 0.021,
    points: [
      [-0.1, -0.39, -1.05],
      [-0.34, -0.55, -0.97],
      [-0.54, -0.79, -0.8],
      [-0.62, -1.04, -0.58],
    ],
  },
  {
    color: "#4168b4",
    emissive: "#091632",
    radius: 0.019,
    points: [
      [-0.07, -0.7, -0.92],
      [0.2, -0.84, -0.84],
      [0.43, -1.05, -0.67],
      [0.54, -1.28, -0.45],
    ],
  },
];

const CONDUCTION_VESSELS: VesselDefinition[] = [
  {
    color: "#63ead7",
    emissive: "#24796f",
    opacity: 0.5,
    radius: 0.014,
    points: [
      [-0.43, 1.18, 0.77],
      [-0.15, 0.92, 0.91],
      [-0.03, 0.6, 1.0],
      [0.01, 0.2, 1.04],
      [0.08, -0.32, 1.0],
      [0.18, -0.92, 0.76],
    ],
  },
];

function toCurve(points: Point3[]) {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
}

function createTaperedTubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  tubularSegments: number,
  radius: number,
  radialSegments: number,
) {
  const geometry = new THREE.BufferGeometry();
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let segment = 0; segment <= tubularSegments; segment += 1) {
    const t = segment / tubularSegments;
    const taper = 0.24 + 0.76 * Math.pow(1 - t, 0.62);
    const localRadius = radius * taper;
    curve.getPointAt(t, point);

    for (let side = 0; side < radialSegments; side += 1) {
      const angle = (side / radialSegments) * Math.PI * 2;
      normal
        .copy(frames.normals[segment])
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[segment], Math.sin(angle))
        .normalize();
      positions.push(
        point.x + normal.x * localRadius,
        point.y + normal.y * localRadius,
        point.z + normal.z * localRadius,
      );
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(t, side / radialSegments);
    }
  }

  for (let segment = 0; segment < tubularSegments; segment += 1) {
    for (let side = 0; side < radialSegments; side += 1) {
      const nextSide = (side + 1) % radialSegments;
      const a = segment * radialSegments + side;
      const b = (segment + 1) * radialSegments + side;
      const c = (segment + 1) * radialSegments + nextSide;
      const d = segment * radialSegments + nextSide;
      indices.push(a, b, d, b, c, d);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function AnatomicalTube({
  definition,
  highlight = false,
}: {
  definition: VesselDefinition;
  highlight?: boolean;
}) {
  const geometry = useMemo(() => {
    const curve = toCurve(definition.points);
    return createTaperedTubeGeometry(
      curve,
      Math.max(72, definition.points.length * 24),
      definition.radius,
      definition.radius > 0.08 ? 32 : 18,
    );
  }, [definition]);

  const vesselColor = useMemo(() => {
    const color = new THREE.Color(definition.color);
    color.offsetHSL(0, -0.08, -0.12);
    return color;
  }, [definition.color]);

  return (
    <mesh geometry={geometry} castShadow={definition.radius > 0.08}>
      <meshPhysicalMaterial
        color={highlight ? "#ffad42" : vesselColor}
        emissive={highlight ? "#ff7a19" : definition.emissive ?? "#000000"}
        emissiveIntensity={highlight ? 0.8 : definition.emissive ? 0.2 : 0}
        roughness={definition.radius > 0.08 ? 0.35 : 0.46}
        clearcoat={definition.radius > 0.08 ? 0.42 : 0.3}
        clearcoatRoughness={0.28}
        sheen={0.18}
        sheenColor={new THREE.Color("#ffd7cf")}
        transparent={(definition.opacity ?? 1) < 1}
        opacity={definition.opacity ?? 1}
      />
    </mesh>
  );
}

function HeartModel({
  disease,
  simulation,
  paused,
  reducedMotion,
  motionTelemetry,
}: HeartSceneProps) {
  const root = useRef<THREE.Group>(null);
  const ventricularAssembly = useRef<THREE.Group>(null);
  const atrialAssembly = useRef<THREE.Group>(null);
  const coronaryLayer = useRef<THREE.Group>(null);
  const posteriorCoronaryLayer = useRef<THREE.Group>(null);
  const conductionLayer = useRef<THREE.Group>(null);
  const greatVessels = useRef<THREE.Group>(null);
  const pericardialLayer = useRef<THREE.Object3D>(null);
  const aorticFlow = useRef<THREE.Group>(null);
  const backFlow = useRef<THREE.Group>(null);
  const electricPulse = useRef<THREE.Mesh>(null);
  const lesionPatch = useRef<THREE.Mesh>(null);
  const phase = useRef(0);

  const severity = simulation.severity / 100;
  const activeColor = disease.color;
  const region = disease.region;
  const dilation = disease.id === "heart-failure" ? severity * 0.2 : 0;
  const septalGrowth = disease.id === "hcm" ? severity * 0.35 : 0;
  const atrialGrowth = disease.id === "mitral-regurgitation" ? severity * 0.16 : 0;

  const ventActive = [
    "ventricles",
    "left-ventricle",
    "anterior-lv",
    "septum",
  ].includes(region);
  const atriaActive = region === "atria" || region === "mitral-valve";
  const valveAorticActive = region === "aortic-valve";
  const valveMitralActive = region === "mitral-valve";
  const nodeActive = region === "av-node";
  const coronaryActive = region === "anterior-lv";

  const { scene } = useGLTF("/models/heart-anatomy-high-detail.glb");
  const motionUniforms = useRef<HeartMotionUniforms>(
    createHeartMotionUniforms(),
  );
  const anatomicalAsset = useMemo(() => {
    const model = scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];

    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const source = object.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      material.color.set("#ffffff");
      material.roughness = 0.64;
      material.metalness = 0.01;
      material.emissive.set("#ffffff");
      material.emissiveMap = source.map;
      material.emissiveIntensity = 0.04;
      material.normalScale.set(0.82, 0.82);
      material.side = THREE.DoubleSide;
      object.material = material;
      object.castShadow = true;
      object.receiveShadow = false;
      materials.push(material);
    });

    return { model, materials };
  }, [scene]);

  useEffect(() => {
    anatomicalAsset.materials.forEach((material) => {
      addRegionalHeartMotion(material, motionUniforms.current);
    });
  }, [anatomicalAsset]);

  useEffect(() => {
    const calibration = computeCardiacMotion({
      phase: motionTelemetry.phase,
      beatIndex: Math.floor(phase.current),
      diseaseId: disease.id,
      severity,
      contractility: simulation.contractility,
    });
    motionUniforms.current.uContractility.value = simulation.contractility;
    motionUniforms.current.uTwist.value = calibration.twist;
    motionUniforms.current.uAtrialFlutter.value = calibration.atrialFlutter;
    motionUniforms.current.uDyssynchrony.value = calibration.dyssynchrony;
    motionUniforms.current.uRegionalDysfunction.value =
      calibration.regionalDysfunction;
  }, [disease.id, motionTelemetry, severity, simulation.contractility]);

  const pericardialAsset = useMemo(() => {
    const model = scene.clone(true);
    const materials: THREE.MeshPhysicalMaterial[] = [];

    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = new THREE.MeshPhysicalMaterial({
        color: "#ff5f62",
        emissive: "#ff3038",
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.11,
        roughness: 0.22,
        clearcoat: 0.7,
        clearcoatRoughness: 0.22,
        transmission: 0.06,
        depthWrite: false,
        side: THREE.BackSide,
      });
      object.material = material;
      materials.push(material);
    });

    return { model, materials };
  }, [scene]);

  useEffect(() => {
    anatomicalAsset.materials.forEach((material) => {
      material.emissive.set("#ffffff");
      material.emissiveIntensity =
        ventActive || atriaActive ? 0.055 + severity * 0.025 : 0.035;
    });

    pericardialAsset.materials.forEach((material) => {
      material.color.set(activeColor);
      material.emissive.set(activeColor);
      material.opacity = 0.055 + severity * 0.11;
      material.emissiveIntensity = 0.18 + severity * 0.42;
    });
  }, [
    activeColor,
    anatomicalAsset,
    atriaActive,
    pericardialAsset,
    severity,
    ventActive,
  ]);

  const aortaDefinition = useMemo<VesselDefinition>(
    () => ({
      color: "#d83a3d",
      emissive: "#4a0b10",
      radius: 0.245,
      points: [
        [0.27, 0.84, -0.27],
        [0.48, 1.32, -0.33],
        [0.44, 1.83, -0.36],
        [0.12, 2.15, -0.38],
        [-0.4, 2.16, -0.38],
        [-0.82, 1.84, -0.38],
        [-0.94, 1.42, -0.38],
      ],
    }),
    [],
  );
  const aortaCurve = useMemo(() => toCurve(aortaDefinition.points), [aortaDefinition]);
  const conductionCurve = useMemo(
    () => toCurve(CONDUCTION_VESSELS[0].points),
    [],
  );
  const mitralBackflowCurve = useMemo(
    () =>
      toCurve([
        [0.24, 0.42, 0.58],
        [0.36, 0.78, 0.57],
        [0.48, 1.13, 0.46],
        [0.46, 1.42, 0.22],
      ]),
    [],
  );

  useFrame((state, delta) => {
    if (reducedMotion) {
      motionUniforms.current.uVentricularSystole.value = 0;
      motionUniforms.current.uAtrialSystole.value = 0;
      motionUniforms.current.uAtrialFlutter.value = 0;
      motionUniforms.current.uDyssynchrony.value = 0;
      Object.assign(motionTelemetry, {
        atrial: 0,
        ventricular: 0,
        filling: 1,
        skipped: false,
        stage: "filling",
      });
      ventricularAssembly.current?.position.set(0, 0, 0);
      ventricularAssembly.current?.rotation.set(0, 0, 0);
      ventricularAssembly.current?.scale.set(
        1 + dilation * 0.34,
        1 + dilation * 0.18,
        1 + dilation * 0.25,
      );
      [conductionLayer.current, atrialAssembly.current, greatVessels.current].forEach(
        (layer) => {
          layer?.position.set(0, 0, 0);
          layer?.rotation.set(0, 0, 0);
          layer?.scale.set(1, 1, 1);
        },
      );
      [coronaryLayer.current, posteriorCoronaryLayer.current].forEach(
        (layer, index) => {
          if (!layer) return;
          layer.position.set(0, 0, index === 0 ? 0.24 : -0.16);
          layer.rotation.set(0, 0, 0);
          layer.scale.set(1, 1, 1);
        },
      );
      return;
    }
    if (paused) return;

    const irregularity =
      disease.id === "afib"
        ? 1 +
          0.15 * Math.sin(state.clock.elapsedTime * 2.7) +
          0.07 * Math.sin(state.clock.elapsedTime * 5.3)
        : 1;
    phase.current +=
      (delta * simulation.heartRate * irregularity) / 60;

    const cycle = phase.current;
    const motion = computeCardiacMotion({
      phase: cycle,
      beatIndex: Math.floor(cycle),
      diseaseId: disease.id,
      severity,
      contractility: simulation.contractility,
    });
    const ventricularSystole = motion.ventricular;
    const atrialSystole = motion.atrial;
    const skipped = motion.skipped;
    const amplitude = 0.038 + simulation.contractility * 0.05;
    const vtShake =
      disease.id === "vt"
        ? Math.sin(state.clock.elapsedTime * 18) * 0.012 * severity
        : 0;

    Object.assign(motionTelemetry, {
      phase: motion.phase,
      atrial: motion.atrial,
      ventricular: motion.ventricular,
      filling: motion.filling,
      skipped: motion.skipped,
      stage: motion.stage,
    });

    motionUniforms.current.uTime.value = state.clock.elapsedTime;
    motionUniforms.current.uVentricularSystole.value = ventricularSystole;
    motionUniforms.current.uAtrialSystole.value = atrialSystole;
    motionUniforms.current.uContractility.value = simulation.contractility;
    motionUniforms.current.uTwist.value = motion.twist;
    motionUniforms.current.uAtrialFlutter.value = motion.atrialFlutter;
    motionUniforms.current.uDyssynchrony.value = motion.dyssynchrony;
    motionUniforms.current.uRegionalDysfunction.value =
      motion.regionalDysfunction;

    if (ventricularAssembly.current) {
      const dilatedX = 1 + dilation * 0.34;
      const dilatedY = 1 + dilation * 0.18;
      const dilatedZ = 1 + dilation * 0.25;
      ventricularAssembly.current.scale.set(
        dilatedX * (1 + vtShake * 0.35),
        dilatedY,
        dilatedZ * (1 - vtShake * 0.24),
      );
      ventricularAssembly.current.position.y = ventricularSystole * 0.012;
      ventricularAssembly.current.rotation.y =
        -ventricularSystole * 0.006 * simulation.contractility;
      ventricularAssembly.current.rotation.z = vtShake * 0.35;
    }

    [coronaryLayer.current, posteriorCoronaryLayer.current].forEach(
      (layer, index) => {
        if (!layer) return;
        const vesselCompression = ventricularSystole * amplitude * 0.78;
        layer.scale.set(
          1 - vesselCompression,
          1 - vesselCompression * 0.42,
          1 - vesselCompression * 0.88,
        );
        layer.position.y = ventricularSystole * 0.028;
        layer.rotation.y =
          (index === 0 ? -1 : 1) * ventricularSystole * motion.twist * 0.36;
      },
    );

    if (conductionLayer.current) {
      const conductionCompression = ventricularSystole * amplitude * 0.68;
      conductionLayer.current.scale.set(
        1 - conductionCompression,
        1 - conductionCompression * 0.4,
        1 - conductionCompression * 0.75,
      );
      conductionLayer.current.position.y = ventricularSystole * 0.024;
    }

    if (atrialAssembly.current) {
      const fibrillation =
        disease.id === "afib"
          ? Math.sin(
              state.clock.elapsedTime * (17 + severity * 13),
            ) *
            0.025 *
            severity
          : 0;
      const atrialContraction = atrialSystole * 0.065;
      atrialAssembly.current.scale.set(
        1 - atrialContraction + fibrillation,
        1 - atrialContraction * 0.72 - fibrillation * 0.35,
        1 - atrialContraction + fibrillation,
      );
      atrialAssembly.current.rotation.y = fibrillation * 1.3;
    }

    if (greatVessels.current) {
      greatVessels.current.position.y = ventricularSystole * 0.022;
      greatVessels.current.scale.set(
        1 + ventricularSystole * 0.012,
        1 + ventricularSystole * 0.008,
        1 + ventricularSystole * 0.012,
      );
    }

    if (root.current) {
      root.current.rotation.z = -0.035 + vtShake * 0.22;
    }

    if (lesionPatch.current) {
      const remainingWallMotion =
        ventricularSystole * amplitude * (1 - motion.regionalDysfunction);
      lesionPatch.current.scale.set(
        0.52 * (1 - remainingWallMotion * 0.72),
        0.76 * (1 - remainingWallMotion * 0.36),
        0.085 + severity * 0.03 - remainingWallMotion * 0.065,
      );
      lesionPatch.current.position.y = -0.5 + remainingWallMotion * 0.24;
    }

    if (aorticFlow.current) {
      aorticFlow.current.children.forEach((particle, index) => {
        particle.visible = ventricularSystole > 0.08;
        const progress =
          (state.clock.elapsedTime *
            (0.14 + simulation.cardiacOutput * 0.026) +
            index / 12) %
          1;
        particle.position.copy(aortaCurve.getPointAt(progress));
        particle.scale.setScalar(0.72 + ventricularSystole * 0.48);
      });
    }

    if (backFlow.current) {
      backFlow.current.children.forEach((particle, index) => {
        particle.visible = ventricularSystole > 0.07;
        const progress =
          (state.clock.elapsedTime * 0.48 + index / 8) % 1;
        particle.position.copy(mitralBackflowCurve.getPointAt(progress));
        particle.scale.setScalar(0.58 + ventricularSystole * 0.62);
      });
    }

    if (pericardialLayer.current) {
      const restrictedMotion = 1 - ventricularSystole * 0.006 * (1 - severity);
      pericardialLayer.current.scale.setScalar(4.61 * restrictedMotion);
    }

    if (electricPulse.current) {
      let progress = motion.phase;
      if (disease.id === "av-block" && progress > 0.43 && skipped) {
        progress = 0.43;
      }
      electricPulse.current.position.copy(
        conductionCurve.getPointAt(progress),
      );
      electricPulse.current.scale.setScalar(
        0.76 + Math.sin(state.clock.elapsedTime * 12) * 0.14,
      );
    }
  });

  return (
    <group
      ref={root}
      rotation={[0.02, -0.04, -0.035]}
      position={[0, -0.08, 0]}
      scale={0.86}
    >
      <group ref={ventricularAssembly}>
        <primitive
          object={anatomicalAsset.model}
          scale={[4.5, 4.5, 4.5]}
          rotation={[0, Math.PI, 0]}
        />

        {region === "septum" && (
          <mesh
            position={[0.03, -0.02, 1.16]}
            rotation={[0, 0.04, -0.02]}
            scale={[0.11 + septalGrowth, 0.82, 0.075]}
          >
            <sphereGeometry args={[1, 80, 56]} />
            <meshPhysicalMaterial
              color={activeColor}
              roughness={0.5}
              clearcoat={0.32}
              emissive={activeColor}
              emissiveIntensity={0.32 + severity * 0.45}
              transparent
              opacity={0.28 + severity * 0.25}
              depthWrite={false}
            />
          </mesh>
        )}

        <group ref={coronaryLayer} position={[0, 0, 0.24]}>
          {CORONARY_VESSELS.map((definition, index) => (
            <AnatomicalTube
              key={`coronary-${index}`}
              definition={definition}
              highlight={coronaryActive && index < 7}
            />
          ))}
        </group>

        <group ref={posteriorCoronaryLayer} position={[0, 0, -0.16]}>
          {POSTERIOR_CORONARY_VESSELS.map((definition, index) => (
            <AnatomicalTube
              key={`posterior-coronary-${index}`}
              definition={definition}
              highlight={coronaryActive && index < 5}
            />
          ))}
        </group>

        <group ref={conductionLayer}>
          {CONDUCTION_VESSELS.map((definition, index) => (
            <AnatomicalTube
              key={`conduction-${index}`}
              definition={{
                ...definition,
                opacity: nodeActive ? 0.86 : 0.055,
              }}
              highlight={nodeActive}
            />
          ))}
        </group>

        <mesh ref={electricPulse}>
          <sphereGeometry args={[0.062, 18, 14]} />
          <meshBasicMaterial
            color={nodeActive ? activeColor : "#9bfff0"}
            transparent
            opacity={nodeActive ? 1 : 0.2}
          />
          <pointLight
            color={nodeActive ? activeColor : "#65ffe7"}
            intensity={nodeActive ? 2.2 : 0.8}
            distance={1.1}
          />
        </mesh>

        {(disease.id === "ischemia" || disease.id === "infarction") && (
          <group>
            <mesh
              ref={lesionPatch}
              position={[0.43, -0.5, 0.84]}
              rotation={[-0.12, 0.02, -0.04]}
              scale={[0.52, 0.76, 0.1]}
            >
              <sphereGeometry args={[1, 52, 34]} />
              <meshPhysicalMaterial
                color={activeColor}
                emissive={activeColor}
                emissiveIntensity={0.38 + severity * 0.72}
                transparent
                opacity={0.24 + severity * 0.46}
                roughness={0.76}
                depthWrite={false}
              />
            </mesh>
            <pointLight
              color={activeColor}
              intensity={0.7 + severity * 1.8}
              distance={2}
              position={[0.44, -0.5, 1.25]}
            />
          </group>
        )}
      </group>

      <group ref={atrialAssembly}>
        {(region === "atria" || disease.id === "afib") && (
          <>
            <mesh
              position={[-0.38, 1.03, 1.11]}
              rotation={[0, 0, 0.13]}
              scale={[1.08, 1.28, 1]}
            >
              <torusGeometry args={[0.2, 0.022, 18, 72]} />
              <meshBasicMaterial
                color={activeColor}
                transparent
                opacity={0.5 + severity * 0.25}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh
              position={[0.4, 1.08, 1.1]}
              rotation={[0, 0, -0.12]}
              scale={[1.08 + atrialGrowth, 1.24 + atrialGrowth, 1]}
            >
              <torusGeometry args={[0.2, 0.022, 18, 72]} />
              <meshBasicMaterial
                color={activeColor}
                transparent
                opacity={0.5 + severity * 0.25}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <pointLight
              color={activeColor}
              intensity={0.25 + severity * 0.45}
              distance={0.85}
              position={[-0.38, 1.03, 1.32]}
            />
            <pointLight
              color={activeColor}
              intensity={0.25 + severity * 0.45}
              distance={0.85}
              position={[0.4, 1.08, 1.31]}
            />
          </>
        )}
      </group>

      <group ref={greatVessels}>
        {valveAorticActive && (
          <mesh
            position={[0.24, 0.93, 0.2]}
            rotation={[Math.PI / 2, 0.12, 0]}
          >
            <torusGeometry
              args={[0.2 - severity * 0.07, 0.045, 14, 44]}
            />
            <meshStandardMaterial
              color={activeColor}
              emissive={activeColor}
              emissiveIntensity={0.9}
            />
          </mesh>
        )}

        {valveMitralActive && (
          <mesh
            position={[0.23, 0.58, 0.48]}
            rotation={[Math.PI / 2, -0.08, 0]}
          >
            <torusGeometry args={[0.245, 0.04, 14, 44]} />
            <meshStandardMaterial
              color={activeColor}
              emissive={activeColor}
              emissiveIntensity={0.95}
            />
          </mesh>
        )}
      </group>

      <mesh position={[-0.14, 0.86, 0.89]}>
        <sphereGeometry
          args={[0.095 + (nodeActive ? severity * 0.045 : 0), 22, 16]}
        />
        <meshBasicMaterial
          color={nodeActive ? activeColor : "#79ead8"}
          transparent
          opacity={nodeActive ? 1 : 0.42}
        />
      </mesh>

      {disease.id === "aortic-stenosis" && (
        <group ref={aorticFlow}>
          {Array.from({ length: 12 }).map((_, index) => (
            <mesh key={index}>
              <sphereGeometry args={[0.033, 16, 12]} />
              <meshBasicMaterial
                color={activeColor}
                transparent
                opacity={0.68}
              />
            </mesh>
          ))}
        </group>
      )}

      {disease.id === "mitral-regurgitation" && (
        <group ref={backFlow}>
          {Array.from({ length: 8 }).map((_, index) => (
            <mesh key={index}>
              <sphereGeometry args={[0.05 + severity * 0.022, 12, 10]} />
              <meshBasicMaterial
                color={activeColor}
                transparent
                opacity={0.88}
              />
            </mesh>
          ))}
        </group>
      )}

      {disease.id === "pericarditis" && (
        <primitive
          ref={pericardialLayer}
          object={pericardialAsset.model}
          scale={[4.61, 4.61, 4.61]}
        />
      )}
    </group>
  );
}

function CanvasLoadingHeart() {
  return (
    <mesh scale={[0.95, 1.35, 0.8]} rotation={[0, 0, -0.08]}>
      <icosahedronGeometry args={[1, 5]} />
      <meshPhysicalMaterial
        color="#8f202d"
        roughness={0.52}
        clearcoat={0.25}
        transparent
        opacity={0.32}
      />
    </mesh>
  );
}

export function HeartScene(props: HeartSceneProps) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    clientMountedSnapshot,
    serverMountedSnapshot,
  );

  if (!mounted) {
    return (
      <div className="heart-loading" role="status">
        <HeartLoadingMark />
        <span>Preparando el corazón 3D…</span>
      </div>
    );
  }

  return (
    <Canvas
      className="heart-canvas"
      dpr={[1, 1.7]}
      camera={{ position: [0, 0.1, 7.15], fov: 36, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.96,
      }}
      data-heart-quality="anatomical-high-detail"
      data-heart-triangles="149992"
      aria-label={`Modelo tridimensional educativo de alta definición con malla anatómica, texturas de tejido y red vascular anterior y posterior. Zona resaltada: ${props.disease.regionLabel}.`}
    >
      <ambientLight intensity={0.72} />
      <hemisphereLight
        color="#fff6f0"
        groundColor="#102036"
        intensity={1.08}
      />
      <directionalLight
        position={[4, 5, 5]}
        intensity={2.25}
        color="#fff8f1"
        castShadow
      />
      <directionalLight
        position={[-4, 2, 4]}
        intensity={1.28}
        color="#a9d7ff"
      />
      <pointLight position={[1, -1, 4]} intensity={0.72} color="#ff8e86" />
      <Suspense fallback={<CanvasLoadingHeart />}>
        <HeartModel {...props} />
      </Suspense>
      <ContactShadows
        position={[0, -2.42, 0]}
        opacity={0.38}
        scale={5.8}
        blur={2.7}
        far={5}
        color="#02070d"
      />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.055}
        minDistance={4.25}
        maxDistance={9}
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI - 0.28}
        autoRotate={props.autoRotate && !props.paused && !props.reducedMotion}
        autoRotateSpeed={0.48}
        target={[0, 0.08, 0]}
      />
    </Canvas>
  );
}

useGLTF.preload("/models/heart-anatomy-high-detail.glb");

function HeartLoadingMark() {
  return (
    <span className="heart-loading-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
