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

type HeartModelProps = HeartSceneProps;

function HeartModel({
  disease,
  simulation,
  paused,
  reducedMotion,
}: HeartModelProps) {
  const root = useRef<THREE.Group>(null);
  const ventricles = useRef<THREE.Group>(null);
  const atria = useRef<THREE.Group>(null);
  const aorticFlow = useRef<THREE.Group>(null);
  const backFlow = useRef<THREE.Group>(null);
  const electricPulse = useRef<THREE.Mesh>(null);
  const phase = useRef(0);

  const severity = simulation.severity / 100;
  const activeColor = disease.color;
  const region = disease.region;
  const dilation = disease.id === "heart-failure" ? severity * 0.24 : 0;
  const septalGrowth = disease.id === "hcm" ? severity * 0.42 : 0;
  const atrialGrowth = disease.id === "mitral-regurgitation" ? severity * 0.18 : 0;

  const aortaCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.22, 1.08, -0.12),
        new THREE.Vector3(0.55, 1.58, -0.08),
        new THREE.Vector3(0.48, 2.18, -0.08),
        new THREE.Vector3(-0.1, 2.48, -0.12),
        new THREE.Vector3(-0.62, 2.18, -0.18),
      ]),
    [],
  );
  const pulmonaryCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.36, 0.95, 0.05),
        new THREE.Vector3(-0.7, 1.55, 0.12),
        new THREE.Vector3(-1.18, 1.72, 0.03),
        new THREE.Vector3(-1.62, 1.55, -0.03),
      ]),
    [],
  );
  const venaCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.65, 2.2, -0.28),
        new THREE.Vector3(-0.72, 1.55, -0.22),
        new THREE.Vector3(-0.62, 1.02, -0.18),
      ]),
    [],
  );
  const leftCoronary = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.12, 1.06, 0.82),
        new THREE.Vector3(0.22, 0.48, 1.0),
        new THREE.Vector3(0.18, -0.22, 1.02),
        new THREE.Vector3(0.1, -0.92, 0.82),
        new THREE.Vector3(-0.08, -1.42, 0.48),
      ]),
    [],
  );
  const rightCoronary = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.05, 1.02, 0.82),
        new THREE.Vector3(-0.45, 0.72, 0.9),
        new THREE.Vector3(-0.76, 0.18, 0.76),
        new THREE.Vector3(-0.7, -0.46, 0.58),
      ]),
    [],
  );
  const conductionCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.35, 1.2, 0.82),
        new THREE.Vector3(-0.08, 0.86, 0.94),
        new THREE.Vector3(0.02, 0.48, 1.0),
        new THREE.Vector3(0.08, -0.2, 1.02),
        new THREE.Vector3(-0.03, -1.1, 0.72),
      ]),
    [],
  );
  const mitralBackflowCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 0.35, 0.5),
        new THREE.Vector3(0.34, 0.75, 0.52),
        new THREE.Vector3(0.43, 1.2, 0.3),
        new THREE.Vector3(0.34, 1.52, 0.04),
      ]),
    [],
  );

  const aortaGeometry = useMemo(
    () => new THREE.TubeGeometry(aortaCurve, 48, 0.18, 18, false),
    [aortaCurve],
  );
  const pulmonaryGeometry = useMemo(
    () => new THREE.TubeGeometry(pulmonaryCurve, 36, 0.16, 16, false),
    [pulmonaryCurve],
  );
  const venaGeometry = useMemo(
    () => new THREE.TubeGeometry(venaCurve, 28, 0.17, 16, false),
    [venaCurve],
  );
  const leftCoronaryGeometry = useMemo(
    () => new THREE.TubeGeometry(leftCoronary, 44, 0.035, 10, false),
    [leftCoronary],
  );
  const rightCoronaryGeometry = useMemo(
    () => new THREE.TubeGeometry(rightCoronary, 36, 0.03, 10, false),
    [rightCoronary],
  );
  const conductionGeometry = useMemo(
    () => new THREE.TubeGeometry(conductionCurve, 40, 0.018, 8, false),
    [conductionCurve],
  );

  useFrame((state, delta) => {
    if (paused || reducedMotion) return;

    const irregularity =
      disease.id === "afib"
        ? 1 + 0.16 * Math.sin(state.clock.elapsedTime * 2.7) + 0.08 * Math.sin(state.clock.elapsedTime * 5.3)
        : 1;
    phase.current += (delta * simulation.heartRate * Math.PI * 2 * irregularity) / 60;

    const cycle = phase.current / (Math.PI * 2);
    const ventricularPulse = Math.pow(
      Math.max(0, Math.sin(phase.current)),
      disease.id === "vt" ? 3 : 9,
    );
    const atrialPulse = Math.pow(
      Math.max(0, Math.sin(phase.current + Math.PI * 0.58)),
      7,
    );
    const skipped =
      disease.id === "av-block" && Math.floor(cycle) % (severity > 0.68 ? 3 : 2) !== 0;
    const effectiveVentricularPulse = skipped ? 0 : ventricularPulse;
    const amplitude = 0.028 + simulation.contractility * 0.042;

    if (ventricles.current) {
      const lateralDesync = disease.id === "vt" ? Math.sin(state.clock.elapsedTime * 17) * 0.015 * severity : 0;
      ventricles.current.scale.set(
        1 - effectiveVentricularPulse * amplitude + lateralDesync,
        1 - effectiveVentricularPulse * amplitude * 1.2,
        1 - effectiveVentricularPulse * amplitude,
      );
      ventricles.current.rotation.z = disease.id === "vt" ? lateralDesync * 0.7 : 0;
    }

    if (atria.current) {
      const fibrillation =
        disease.id === "afib"
          ? Math.sin(state.clock.elapsedTime * (16 + severity * 12)) * 0.025 * severity
          : 0;
      atria.current.scale.setScalar(1 - atrialPulse * 0.035 + fibrillation);
      atria.current.rotation.y = fibrillation * 1.5;
    }

    if (root.current && disease.id === "vt") {
      root.current.rotation.z = -0.03 + Math.sin(state.clock.elapsedTime * 14) * 0.008 * severity;
    }

    if (aorticFlow.current) {
      aorticFlow.current.children.forEach((particle, index) => {
        const progress = (state.clock.elapsedTime * (0.12 + simulation.cardiacOutput * 0.025) + index / 10) % 1;
        particle.position.copy(aortaCurve.getPointAt(progress));
        particle.scale.setScalar(0.7 + effectiveVentricularPulse * 0.45);
      });
    }

    if (backFlow.current) {
      backFlow.current.children.forEach((particle, index) => {
        const progress = (state.clock.elapsedTime * 0.46 + index / 7) % 1;
        particle.position.copy(mitralBackflowCurve.getPointAt(progress));
      });
    }

    if (electricPulse.current) {
      let progress = (cycle % 1 + 1) % 1;
      if (disease.id === "av-block" && progress > 0.43 && skipped) progress = 0.43;
      electricPulse.current.position.copy(conductionCurve.getPointAt(progress));
      electricPulse.current.scale.setScalar(0.75 + Math.sin(state.clock.elapsedTime * 12) * 0.15);
    }
  });

  const ventActive = ["ventricles", "left-ventricle", "anterior-lv", "septum"].includes(region);
  const atriaActive = region === "atria" || region === "mitral-valve";
  const valveAorticActive = region === "aortic-valve";
  const valveMitralActive = region === "mitral-valve";
  const nodeActive = region === "av-node";

  return (
    <group ref={root} rotation={[0.04, -0.28, -0.03]} position={[0, -0.2, 0]}>
      <group ref={ventricles}>
        <mesh
          position={[0.34, -0.2, -0.04]}
          rotation={[0.04, -0.05, -0.13]}
          scale={[1.02 + dilation, 1.55 + dilation * 1.3, 0.92 + dilation * 0.7]}
          castShadow
        >
          <sphereGeometry args={[1, 64, 48]} />
          <meshPhysicalMaterial
            color="#a92f49"
            roughness={0.52}
            clearcoat={0.36}
            clearcoatRoughness={0.48}
            emissive={ventActive ? activeColor : "#25050d"}
            emissiveIntensity={ventActive ? 0.2 + severity * 0.85 : 0.12}
          />
        </mesh>
        <mesh
          position={[-0.56, -0.12, 0.3]}
          rotation={[0.02, 0.15, 0.22]}
          scale={[0.84, 1.29, 0.68]}
          castShadow
        >
          <sphereGeometry args={[1, 56, 42]} />
          <meshPhysicalMaterial
            color="#bd3c50"
            roughness={0.58}
            clearcoat={0.28}
            emissive={region === "ventricles" ? activeColor : "#28060c"}
            emissiveIntensity={region === "ventricles" ? 0.25 + severity * 0.8 : 0.08}
          />
        </mesh>

        <mesh
          position={[0.04, -0.18, 0.64]}
          rotation={[0, 0.08, -0.05]}
          scale={[0.22 + septalGrowth, 1.08, 0.24]}
        >
          <sphereGeometry args={[1, 38, 28]} />
          <meshStandardMaterial
            color={region === "septum" ? activeColor : "#7f2238"}
            roughness={0.62}
            emissive={region === "septum" ? activeColor : "#19040a"}
            emissiveIntensity={region === "septum" ? 0.32 + severity * 0.72 : 0.1}
          />
        </mesh>

        {(disease.id === "ischemia" || disease.id === "infarction") && (
          <group>
            <mesh position={[0.45, -0.48, 0.86]} rotation={[-0.15, 0.02, -0.08]} scale={[0.58, 0.82, 0.11]}>
              <sphereGeometry args={[1, 48, 30]} />
              <meshPhysicalMaterial
                color={activeColor}
                emissive={activeColor}
                emissiveIntensity={0.55 + severity * 1.2}
                transparent
                opacity={0.34 + severity * 0.5}
                roughness={0.7}
                depthWrite={false}
              />
            </mesh>
            <pointLight
              color={activeColor}
              intensity={1.5 + severity * 3}
              distance={2.4}
              position={[0.4, -0.45, 1.35]}
            />
          </group>
        )}
      </group>

      <group ref={atria}>
        <mesh position={[0.38, 1.16, -0.04]} scale={[0.68 + atrialGrowth, 0.58 + atrialGrowth, 0.58]} castShadow>
          <sphereGeometry args={[1, 48, 36]} />
          <meshPhysicalMaterial
            color="#9c2943"
            roughness={0.5}
            clearcoat={0.32}
            emissive={atriaActive ? activeColor : "#22040a"}
            emissiveIntensity={atriaActive ? 0.25 + severity : 0.08}
          />
        </mesh>
        <mesh position={[-0.56, 1.05, -0.02]} scale={[0.66, 0.6, 0.6]} castShadow>
          <sphereGeometry args={[1, 48, 36]} />
          <meshPhysicalMaterial
            color="#a82f47"
            roughness={0.54}
            clearcoat={0.3}
            emissive={region === "atria" ? activeColor : "#24050b"}
            emissiveIntensity={region === "atria" ? 0.25 + severity : 0.08}
          />
        </mesh>
      </group>

      <mesh geometry={aortaGeometry} castShadow>
        <meshPhysicalMaterial
          color="#cc5062"
          roughness={0.42}
          clearcoat={0.42}
          emissive={valveAorticActive ? activeColor : "#26070d"}
          emissiveIntensity={valveAorticActive ? 0.35 + severity * 0.7 : 0.08}
        />
      </mesh>
      <mesh geometry={pulmonaryGeometry} castShadow>
        <meshPhysicalMaterial color="#5d79a8" roughness={0.48} clearcoat={0.3} />
      </mesh>
      <mesh geometry={venaGeometry} castShadow>
        <meshPhysicalMaterial color="#516f9b" roughness={0.5} clearcoat={0.28} />
      </mesh>

      <mesh geometry={leftCoronaryGeometry}>
        <meshStandardMaterial
          color={region === "anterior-lv" ? activeColor : "#e47f78"}
          emissive={region === "anterior-lv" ? activeColor : "#45130e"}
          emissiveIntensity={region === "anterior-lv" ? 1.15 : 0.35}
        />
      </mesh>
      <mesh geometry={rightCoronaryGeometry}>
        <meshStandardMaterial color="#db756e" emissive="#3b100e" emissiveIntensity={0.32} />
      </mesh>

      <mesh geometry={conductionGeometry}>
        <meshBasicMaterial
          color={nodeActive ? activeColor : "#55e8d3"}
          transparent
          opacity={nodeActive ? 1 : 0.68}
        />
      </mesh>
      <mesh ref={electricPulse}>
        <sphereGeometry args={[0.075, 18, 14]} />
        <meshBasicMaterial color={nodeActive ? activeColor : "#a6fff0"} />
        <pointLight color={nodeActive ? activeColor : "#65ffe7"} intensity={2.3} distance={1.2} />
      </mesh>

      <mesh position={[0.28, 1.02, 0.18]} rotation={[Math.PI / 2, 0.16, 0]}>
        <torusGeometry args={[0.23 - (valveAorticActive ? severity * 0.08 : 0), 0.055, 14, 44]} />
        <meshStandardMaterial
          color={valveAorticActive ? activeColor : "#e7a1a0"}
          emissive={valveAorticActive ? activeColor : "#3a1015"}
          emissiveIntensity={valveAorticActive ? 1.2 : 0.25}
        />
      </mesh>
      <mesh position={[0.16, 0.56, 0.47]} rotation={[Math.PI / 2, -0.08, 0]}>
        <torusGeometry args={[0.27, 0.045, 14, 44]} />
        <meshStandardMaterial
          color={valveMitralActive ? activeColor : "#eab0ae"}
          emissive={valveMitralActive ? activeColor : "#3d1518"}
          emissiveIntensity={valveMitralActive ? 1.2 : 0.22}
        />
      </mesh>

      <mesh position={[-0.08, 0.83, 0.9]}>
        <sphereGeometry args={[0.11 + (nodeActive ? severity * 0.05 : 0), 22, 16]} />
        <meshBasicMaterial color={nodeActive ? activeColor : "#7ef6df"} />
      </mesh>

      <group ref={aorticFlow}>
        {Array.from({ length: 10 }).map((_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.047, 12, 10]} />
            <meshBasicMaterial color="#ffd3ca" transparent opacity={0.82} />
          </mesh>
        ))}
      </group>

      {disease.id === "mitral-regurgitation" && (
        <group ref={backFlow}>
          {Array.from({ length: 7 }).map((_, index) => (
            <mesh key={index}>
              <sphereGeometry args={[0.055 + severity * 0.025, 12, 10]} />
              <meshBasicMaterial color={activeColor} transparent opacity={0.88} />
            </mesh>
          ))}
        </group>
      )}

      {disease.id === "pericarditis" && (
        <mesh scale={[1.34 + severity * 0.08, 2.0 + severity * 0.08, 1.24 + severity * 0.08]} position={[-0.02, 0.08, -0.02]}>
          <sphereGeometry args={[1, 56, 44]} />
          <meshPhysicalMaterial
            color={activeColor}
            emissive={activeColor}
            emissiveIntensity={0.35 + severity * 0.55}
            transparent
            opacity={0.08 + severity * 0.16}
            roughness={0.26}
            transmission={0.18}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
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
      camera={{ position: [0.2, 0.2, 6.6], fov: 38, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-label={`Modelo tridimensional educativo del corazón. Zona resaltada: ${props.disease.regionLabel}.`}
    >
      <ambientLight intensity={0.72} />
      <hemisphereLight color="#d9f7ff" groundColor="#101827" intensity={1.15} />
      <directionalLight position={[4, 5, 4]} intensity={2.2} color="#fff1e6" castShadow />
      <pointLight position={[-3, 1, 3]} intensity={1.2} color="#6bbcff" />
      <pointLight position={[2, -2, 2]} intensity={0.8} color="#ff708b" />
      <HeartModel {...props} />
      <ContactShadows
        position={[0, -2.35, 0]}
        opacity={0.35}
        scale={6}
        blur={2.5}
        far={5}
        color="#02070d"
      />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.055}
        minDistance={4.1}
        maxDistance={9}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI - 0.3}
        autoRotate={props.autoRotate && !props.paused && !props.reducedMotion}
        autoRotateSpeed={0.55}
        target={[0, 0.15, 0]}
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
