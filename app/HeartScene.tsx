"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Disease, DerivedSimulation } from "./simulation";

type HeartSceneProps = {
  disease: Disease;
  simulation: DerivedSimulation;
  paused: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
};

type Point3 = [number, number, number];

type VesselDefinition = {
  points: Point3[];
  radius: number;
  color: string;
  emissive?: string;
  opacity?: number;
};

const RED = "#ef3636";
const RED_DARK = "#a51425";
const VEIN_BLUE = "#325eb5";
const VEIN_LIGHT = "#4f78cb";

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

function createTissueTexture() {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  let seed = 7919;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const wave = Math.sin(x * 0.34 + Math.sin(y * 0.11)) * 9;
      const grain = (random() - 0.5) * 26;
      const value = Math.max(72, Math.min(190, 126 + wave + grain));
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.2, 4.4);
  texture.needsUpdate = true;
  return texture;
}

function createVentricleGeometry(kind: "left" | "right") {
  const geometry = new THREE.SphereGeometry(1, 88, 60);
  const positions = geometry.attributes.position as THREE.BufferAttribute;

  for (let index = 0; index < positions.count; index += 1) {
    const originalX = positions.getX(index);
    const originalY = positions.getY(index);
    const originalZ = positions.getZ(index);
    const height = (originalY + 1) / 2;
    const lowerTaper = 0.58 + height * 0.42;
    const shoulder = 1 + Math.sin(Math.PI * Math.min(1, height * 1.08)) * 0.12;
    const topFlatten = originalY > 0.52 ? 0.52 + (originalY - 0.52) * 0.35 : originalY;

    if (kind === "left") {
      const x = originalX * 1.03 * lowerTaper * shoulder + 0.14 * (1 - height);
      const y = topFlatten * 1.64 - 0.11;
      const z = originalZ * 0.88 * (0.78 + height * 0.22) + 0.08 * (1 - originalY * originalY);
      positions.setXYZ(index, x, y, z);
    } else {
      const x = originalX * 0.82 * lowerTaper - 0.05 * (1 - height);
      const y = topFlatten * 1.35 + 0.02;
      const z = originalZ * 0.64 + 0.15 * (1 - originalY * originalY);
      positions.setXYZ(index, x, y, z);
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function toCurve(points: Point3[]) {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
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
    return new THREE.TubeGeometry(
      curve,
      Math.max(28, definition.points.length * 14),
      definition.radius,
      definition.radius > 0.08 ? 24 : 12,
      false,
    );
  }, [definition]);

  return (
    <mesh geometry={geometry} castShadow={definition.radius > 0.08}>
      <meshPhysicalMaterial
        color={highlight ? "#ffad42" : definition.color}
        emissive={highlight ? "#ff7a19" : definition.emissive ?? "#000000"}
        emissiveIntensity={highlight ? 0.8 : definition.emissive ? 0.2 : 0}
        roughness={definition.radius > 0.08 ? 0.34 : 0.48}
        clearcoat={definition.radius > 0.08 ? 0.38 : 0.2}
        transparent={(definition.opacity ?? 1) < 1}
        opacity={definition.opacity ?? 1}
      />
    </mesh>
  );
}

function VesselMouth({
  position,
  direction,
  radius,
  color,
}: {
  position: Point3;
  direction: Point3;
  radius: number;
  color: string;
}) {
  const quaternion = useMemo(() => {
    const normal = new THREE.Vector3(...direction).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );
  }, [direction]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <torusGeometry args={[radius * 0.78, radius * 0.18, 14, 40]} />
        <meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.4} />
      </mesh>
      <mesh position={[0, 0, -0.007]}>
        <circleGeometry args={[radius * 0.67, 36]} />
        <meshStandardMaterial color="#5e1017" roughness={0.92} />
      </mesh>
    </group>
  );
}

function HeartModel({
  disease,
  simulation,
  paused,
  reducedMotion,
}: HeartSceneProps) {
  const root = useRef<THREE.Group>(null);
  const ventricularAssembly = useRef<THREE.Group>(null);
  const leftVentricle = useRef<THREE.Mesh>(null);
  const rightVentricle = useRef<THREE.Mesh>(null);
  const atrialAssembly = useRef<THREE.Group>(null);
  const greatVessels = useRef<THREE.Group>(null);
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

  const tissueTexture = useMemo(createTissueTexture, []);
  const leftGeometry = useMemo(() => createVentricleGeometry("left"), []);
  const rightGeometry = useMemo(() => createVentricleGeometry("right"), []);

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
  const aorticBranches = useMemo<VesselDefinition[]>(
    () => [
      {
        color: "#df4142",
        emissive: "#4a0b10",
        radius: 0.14,
        points: [
          [-0.48, 2.05, -0.36],
          [-0.55, 2.36, -0.35],
          [-0.54, 2.72, -0.32],
        ],
      },
      {
        color: "#df4142",
        emissive: "#4a0b10",
        radius: 0.145,
        points: [
          [-0.08, 2.14, -0.37],
          [0.0, 2.46, -0.33],
          [0.09, 2.78, -0.27],
        ],
      },
      {
        color: "#df4142",
        emissive: "#4a0b10",
        radius: 0.13,
        points: [
          [0.26, 2.03, -0.34],
          [0.47, 2.32, -0.28],
          [0.68, 2.61, -0.18],
        ],
      },
    ],
    [],
  );
  const pulmonaryTrunk = useMemo<VesselDefinition>(
    () => ({
      color: VEIN_BLUE,
      emissive: "#081538",
      radius: 0.225,
      points: [
        [-0.38, 0.92, 0.23],
        [-0.54, 1.37, 0.35],
        [-0.35, 1.73, 0.43],
        [0.08, 1.83, 0.43],
        [0.48, 1.73, 0.38],
        [0.85, 1.53, 0.27],
      ],
    }),
    [],
  );
  const superiorVenaCava = useMemo<VesselDefinition>(
    () => ({
      color: VEIN_BLUE,
      emissive: "#081538",
      radius: 0.205,
      points: [
        [-0.86, 2.62, -0.12],
        [-0.85, 2.2, -0.08],
        [-0.81, 1.72, -0.02],
        [-0.72, 1.23, 0.05],
        [-0.59, 0.98, 0.08],
      ],
    }),
    [],
  );
  const pulmonaryVeins = useMemo<VesselDefinition[]>(
    () => [
      {
        color: "#dd4245",
        emissive: "#4a0b10",
        radius: 0.115,
        points: [
          [-0.64, 1.18, -0.28],
          [-1.04, 1.26, -0.25],
          [-1.3, 1.36, -0.18],
        ],
      },
      {
        color: "#dd4245",
        emissive: "#4a0b10",
        radius: 0.105,
        points: [
          [-0.62, 1.0, -0.23],
          [-1.0, 0.98, -0.19],
          [-1.28, 0.9, -0.1],
        ],
      },
      {
        color: "#dd4245",
        emissive: "#4a0b10",
        radius: 0.12,
        points: [
          [0.58, 1.2, -0.25],
          [0.94, 1.28, -0.17],
          [1.27, 1.39, -0.02],
        ],
      },
      {
        color: "#dd4245",
        emissive: "#4a0b10",
        radius: 0.11,
        points: [
          [0.6, 1.01, -0.2],
          [0.96, 1.0, -0.11],
          [1.29, 0.93, 0.04],
        ],
      },
    ],
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
    if (paused || reducedMotion) return;

    const irregularity =
      disease.id === "afib"
        ? 1 +
          0.15 * Math.sin(state.clock.elapsedTime * 2.7) +
          0.07 * Math.sin(state.clock.elapsedTime * 5.3)
        : 1;
    phase.current +=
      (delta * simulation.heartRate * Math.PI * 2 * irregularity) / 60;

    const cycle = phase.current / (Math.PI * 2);
    const systole = Math.pow(
      Math.max(0, Math.sin(phase.current)),
      disease.id === "vt" ? 3.2 : 7.5,
    );
    const atrialSystole = Math.pow(
      Math.max(0, Math.sin(phase.current + Math.PI * 0.64)),
      8,
    );
    const skipped =
      disease.id === "av-block" &&
      Math.floor(cycle) % (severity > 0.68 ? 3 : 2) !== 0;
    const ventricularSystole = skipped ? 0 : systole;
    const amplitude = 0.032 + simulation.contractility * 0.045;
    const vtShake =
      disease.id === "vt"
        ? Math.sin(state.clock.elapsedTime * 18) * 0.012 * severity
        : 0;

    if (ventricularAssembly.current) {
      ventricularAssembly.current.scale.set(
        1 - ventricularSystole * amplitude + vtShake,
        1 - ventricularSystole * amplitude * 0.52,
        1 - ventricularSystole * amplitude * 0.82,
      );
      ventricularAssembly.current.position.y = ventricularSystole * 0.035;
      ventricularAssembly.current.rotation.y =
        -ventricularSystole * 0.018 * simulation.contractility;
      ventricularAssembly.current.rotation.z = vtShake * 0.35;
    }

    if (leftVentricle.current) {
      leftVentricle.current.rotation.z =
        -0.04 - ventricularSystole * 0.008;
    }

    if (rightVentricle.current) {
      const rightLag =
        disease.id === "vt"
          ? Math.sin(phase.current - 0.3) * 0.012 * severity
          : 0;
      rightVentricle.current.scale.set(
        1 + rightLag,
        1 - rightLag * 0.5,
        1 + rightLag,
      );
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
      const atrialContraction = atrialSystole * 0.035;
      atrialAssembly.current.scale.set(
        1 - atrialContraction + fibrillation,
        1 - atrialContraction * 0.72 - fibrillation * 0.35,
        1 - atrialContraction + fibrillation,
      );
      atrialAssembly.current.rotation.y = fibrillation * 1.3;
    }

    if (greatVessels.current) {
      greatVessels.current.position.y = ventricularSystole * 0.014;
      greatVessels.current.scale.set(
        1 + ventricularSystole * 0.006,
        1 + ventricularSystole * 0.004,
        1 + ventricularSystole * 0.006,
      );
    }

    if (root.current) {
      root.current.rotation.z = -0.035 + vtShake * 0.22;
    }

    if (lesionPatch.current) {
      lesionPatch.current.scale.z =
        0.085 + severity * 0.03 - ventricularSystole * 0.006 * (1 - severity);
    }

    if (aorticFlow.current) {
      aorticFlow.current.children.forEach((particle, index) => {
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
        const progress =
          (state.clock.elapsedTime * 0.48 + index / 8) % 1;
        particle.position.copy(mitralBackflowCurve.getPointAt(progress));
      });
    }

    if (electricPulse.current) {
      let progress = (cycle % 1 + 1) % 1;
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

  return (
    <group
      ref={root}
      rotation={[0.02, -0.04, -0.035]}
      position={[0, -0.36, 0]}
      scale={0.94}
    >
      <group ref={ventricularAssembly}>
        <mesh
          ref={leftVentricle}
          geometry={leftGeometry}
          position={[0.25, -0.27, -0.02]}
          rotation={[0.015, -0.015, -0.04]}
          scale={[
            1.02 + dilation,
            1 + dilation * 0.82,
            0.98 + dilation * 0.65,
          ]}
          castShadow
        >
          <meshPhysicalMaterial
            color="#c83d3f"
            roughness={0.56}
            clearcoat={0.28}
            clearcoatRoughness={0.46}
            sheen={0.42}
            sheenColor={new THREE.Color("#ffb0a3")}
            sheenRoughness={0.72}
            bumpMap={tissueTexture}
            bumpScale={0.052}
            emissive={ventActive ? activeColor : "#2d0508"}
            emissiveIntensity={ventActive ? 0.07 + severity * 0.2 : 0.025}
          />
        </mesh>

        <mesh
          ref={rightVentricle}
          geometry={rightGeometry}
          position={[-0.55, -0.08, 0.3]}
          rotation={[0.03, 0.13, 0.12]}
          scale={[1, 1, 1]}
          castShadow
        >
          <meshPhysicalMaterial
            color="#d84a49"
            roughness={0.58}
            clearcoat={0.25}
            sheen={0.34}
            sheenColor={new THREE.Color("#ffb5a8")}
            sheenRoughness={0.78}
            bumpMap={tissueTexture}
            bumpScale={0.048}
            emissive={region === "ventricles" ? activeColor : "#310609"}
            emissiveIntensity={region === "ventricles" ? 0.08 + severity * 0.22 : 0.025}
          />
        </mesh>

        <mesh
          position={[0.02, -0.11, 0.73]}
          rotation={[0, 0.04, -0.02]}
          scale={[0.13 + septalGrowth, 0.93, 0.11]}
        >
          <sphereGeometry args={[1, 40, 30]} />
          <meshStandardMaterial
            color={region === "septum" ? activeColor : "#ac2932"}
            roughness={0.64}
            emissive={region === "septum" ? activeColor : "#260308"}
            emissiveIntensity={region === "septum" ? 0.35 + severity * 0.5 : 0.04}
          />
        </mesh>

        <group position={[0, 0, 0.045]}>
          {CORONARY_VESSELS.map((definition, index) => (
            <AnatomicalTube
              key={`coronary-${index}`}
              definition={definition}
              highlight={coronaryActive && index < 7}
            />
          ))}
        </group>

        <group>
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
        <mesh
          position={[-0.55, 1.05, 0.03]}
          rotation={[0, 0, 0.15]}
          scale={[0.58, 0.68, 0.52]}
          castShadow
        >
          <sphereGeometry args={[1, 52, 38]} />
          <meshPhysicalMaterial
            color="#d44845"
            roughness={0.55}
            clearcoat={0.24}
            bumpMap={tissueTexture}
            bumpScale={0.025}
            emissive={region === "atria" ? activeColor : "#2b0507"}
            emissiveIntensity={region === "atria" ? 0.06 + severity * 0.16 : 0.025}
          />
        </mesh>
        <mesh
          position={[0.47, 1.12, -0.07]}
          scale={[0.6 + atrialGrowth, 0.6 + atrialGrowth, 0.5]}
          castShadow
        >
          <sphereGeometry args={[1, 52, 38]} />
          <meshPhysicalMaterial
            color="#cb3f40"
            roughness={0.54}
            clearcoat={0.25}
            bumpMap={tissueTexture}
            bumpScale={0.025}
            emissive={atriaActive ? activeColor : "#2a0508"}
            emissiveIntensity={atriaActive ? 0.055 + severity * 0.15 : 0.025}
          />
        </mesh>
        <mesh
          position={[-0.91, 0.92, 0.29]}
          rotation={[0.1, -0.1, -0.45]}
          scale={[0.3, 0.52, 0.22]}
          castShadow
        >
          <sphereGeometry args={[1, 40, 28]} />
          <meshPhysicalMaterial
            color="#d74a47"
            roughness={0.58}
            clearcoat={0.22}
            bumpMap={tissueTexture}
            bumpScale={0.028}
            emissive={region === "atria" ? activeColor : "#2b0507"}
            emissiveIntensity={region === "atria" ? 0.065 + severity * 0.16 : 0.025}
          />
        </mesh>
        <mesh
          position={[0.82, 1.03, 0.24]}
          rotation={[0, 0.1, 0.38]}
          scale={[0.3 + atrialGrowth * 0.4, 0.48, 0.22]}
          castShadow
        >
          <sphereGeometry args={[1, 40, 28]} />
          <meshPhysicalMaterial
            color="#d94b48"
            roughness={0.56}
            clearcoat={0.22}
            bumpMap={tissueTexture}
            bumpScale={0.028}
            emissive={atriaActive ? activeColor : "#2b0507"}
            emissiveIntensity={atriaActive ? 0.06 + severity * 0.16 : 0.025}
          />
        </mesh>
      </group>

      <group ref={greatVessels}>
        <AnatomicalTube
          definition={aortaDefinition}
          highlight={valveAorticActive}
        />
        {aorticBranches.map((definition, index) => (
          <AnatomicalTube
            key={`aortic-branch-${index}`}
            definition={definition}
            highlight={false}
          />
        ))}
        <AnatomicalTube definition={pulmonaryTrunk} />
        <AnatomicalTube definition={superiorVenaCava} />
        {pulmonaryVeins.map((definition, index) => (
          <AnatomicalTube
            key={`pulmonary-vein-${index}`}
            definition={definition}
          />
        ))}

        <VesselMouth
          position={[-0.54, 2.72, -0.32]}
          direction={[0, 1, 0.08]}
          radius={0.14}
          color="#df4142"
        />
        <VesselMouth
          position={[0.09, 2.78, -0.27]}
          direction={[0.2, 1, 0.14]}
          radius={0.145}
          color="#df4142"
        />
        <VesselMouth
          position={[0.68, 2.61, -0.18]}
          direction={[0.54, 0.82, 0.2]}
          radius={0.13}
          color="#df4142"
        />
        <VesselMouth
          position={[-0.86, 2.62, -0.12]}
          direction={[0, 1, 0.06]}
          radius={0.205}
          color={VEIN_LIGHT}
        />
        <VesselMouth
          position={[0.85, 1.53, 0.27]}
          direction={[0.9, -0.1, -0.2]}
          radius={0.225}
          color={VEIN_LIGHT}
        />

        {pulmonaryVeins.map((definition, index) => {
          const end = definition.points[definition.points.length - 1];
          const previous = definition.points[definition.points.length - 2];
          const direction: Point3 = [
            end[0] - previous[0],
            end[1] - previous[1],
            end[2] - previous[2],
          ];
          return (
            <VesselMouth
              key={`pulmonary-mouth-${index}`}
              position={end}
              direction={direction}
              radius={definition.radius}
              color="#e44a4c"
            />
          );
        })}

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

      <group ref={aorticFlow}>
        {Array.from({ length: 12 }).map((_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.042, 12, 10]} />
            <meshBasicMaterial
              color="#ffd8cf"
              transparent
              opacity={0.82}
            />
          </mesh>
        ))}
      </group>

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
        <group position={[0.08, -0.15, 0]} scale={[1.22, 1.18, 1.22]}>
          <mesh geometry={leftGeometry} position={[0.18, -0.12, -0.02]}>
            <meshPhysicalMaterial
              color={activeColor}
              emissive={activeColor}
              emissiveIntensity={0.25 + severity * 0.45}
              transparent
              opacity={0.07 + severity * 0.12}
              roughness={0.28}
              transmission={0.12}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function HeartScene(props: HeartSceneProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        toneMappingExposure: 1.12,
      }}
      aria-label={`Modelo tridimensional educativo del corazón inspirado en la referencia anatómica aportada. Zona resaltada: ${props.disease.regionLabel}.`}
    >
      <ambientLight intensity={1.05} />
      <hemisphereLight
        color="#fff6f0"
        groundColor="#102036"
        intensity={1.45}
      />
      <directionalLight
        position={[4, 5, 5]}
        intensity={3.1}
        color="#fff8f1"
        castShadow
      />
      <directionalLight
        position={[-4, 2, 4]}
        intensity={1.8}
        color="#a9d7ff"
      />
      <pointLight position={[1, -1, 4]} intensity={1.2} color="#ff8e86" />
      <HeartModel {...props} />
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

function HeartLoadingMark() {
  return (
    <span className="heart-loading-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
