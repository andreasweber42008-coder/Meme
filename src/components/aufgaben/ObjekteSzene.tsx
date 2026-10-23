import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { BEWEGUNGEN, EINHEIT, mal, type Bewegung, type Matrix, type Objekt } from "@/aufgaben/objekte";
import { cn } from "@/lib/utils";

/** 3×3-Drehmatrix (Zeilen) → Quaternion */
function quaternion(m: Matrix): THREE.Quaternion {
  const m4 = new THREE.Matrix4().set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
  return new THREE.Quaternion().setFromRotationMatrix(m4);
}

function Form({ o }: { o: Objekt }) {
  const g = o.groesse;
  const material = useMemo(() => {
    switch (o.material) {
      case "glas":
        return <meshPhysicalMaterial color={o.farbe} transparent opacity={0.45} roughness={0.05} transmission={0.4} />;
      case "metall":
        return <meshStandardMaterial color={o.farbe} metalness={0.85} roughness={0.25} />;
      case "dunkel":
        return <meshStandardMaterial color={new THREE.Color(o.farbe).multiplyScalar(0.35)} roughness={0.7} />;
      case "noppen":
        return <meshStandardMaterial color={o.farbe} roughness={0.9} flatShading />;
      default:
        return <meshStandardMaterial color={o.farbe} roughness={0.6} />;
    }
  }, [o.material, o.farbe]);

  const geometrie = (() => {
    switch (o.form) {
      case "kugel":
        return <sphereGeometry args={[g, o.material === "noppen" ? 10 : 32, o.material === "noppen" ? 8 : 24]} />;
      case "wuerfel":
        return <boxGeometry args={[g * 1.5, g * 1.5, g * 1.5]} />;
      case "zylinder":
        return <cylinderGeometry args={[g * 0.6, g * 0.6, g * 1.8, 28]} />;
      case "kegel":
        return <coneGeometry args={[g * 0.8, g * 1.8, 28]} />;
      case "torus":
        return <torusGeometry args={[g * 0.75, g * 0.25, 14, 36]} />;
      case "kapsel":
        return <capsuleGeometry args={[g * 0.45, g * 1.1, 8, 18]} />;
      case "stab":
        return <boxGeometry args={[g * 0.4, g * 2, g * 0.4]} />;
      case "pyramide":
        return <coneGeometry args={[g * 0.9, g * 1.6, 4]} />;
      case "winkel":
        return null;
    }
  })();

  if (o.form === "winkel") {
    // L-Form aus zwei Quadern – eindeutig unsymmetrisch
    return (
      <group position={o.position} rotation={o.drehung}>
        <mesh position={[0, -g * 0.45, 0]}>
          <boxGeometry args={[g * 1.6, g * 0.45, g * 0.45]} />
          {material}
        </mesh>
        <mesh position={[-g * 0.575, g * 0.225, 0]}>
          <boxGeometry args={[g * 0.45, g * 0.9, g * 0.45]} />
          {material}
        </mesh>
      </group>
    );
  }
  return (
    <mesh position={o.position} rotation={o.drehung}>
      {geometrie}
      {material}
    </mesh>
  );
}

function Inhalt({ objekte, drehung, animiert }: { objekte: Objekt[]; drehung: Matrix; animiert: boolean }) {
  const gruppe = useRef<THREE.Group>(null);
  const ziel = useMemo(() => quaternion(drehung), [drehung]);
  useEffect(() => {
    if (!animiert && gruppe.current) gruppe.current.quaternion.copy(ziel);
  }, [ziel, animiert]);
  useFrame((_, dt) => {
    if (animiert && gruppe.current) gruppe.current.quaternion.slerp(ziel, Math.min(1, dt * 5));
  });
  return (
    <group ref={gruppe}>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial transparent opacity={0.04} color="#8ab4f8" depthWrite={false} />
        <Edges color="#64748b" />
      </mesh>
      {objekte.map((o, i) => (
        <Form key={i} o={o} />
      ))}
    </group>
  );
}

interface Props {
  objekte: Objekt[];
  drehung?: Matrix;
  className?: string;
  /** frei mit dem Finger drehbar (nur im Lernmodus) */
  ziehbar?: boolean;
  animiert?: boolean;
  label?: string;
  /** für den Druck: Zeichenpuffer behalten, damit toDataURL funktioniert */
  fuerDruck?: boolean;
  onCanvas?: (c: HTMLCanvasElement) => void;
}

/** Würfel mit Objekten; Blick leicht von oben vorne wie in den Beispielaufgaben. */
export function ObjekteSzene({ objekte, drehung = EINHEIT, className, ziehbar, animiert, label, fuerDruck, onCanvas }: Props) {
  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-xl border-2 bg-gradient-to-b from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900", className)}>
      <Canvas
        camera={{ position: [0, 0.9, 4.6], fov: 40 }}
        gl={{ preserveDrawingBuffer: !!fuerDruck, antialias: true }}
        onCreated={({ gl }) => onCanvas?.(gl.domElement)}
        aria-label={label ?? "Würfel mit Objekten"}
        role="img"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-4, -2, -3]} intensity={0.3} />
        <Suspense fallback={null}>
          <Inhalt objekte={objekte} drehung={drehung} animiert={!!animiert} />
        </Suspense>
        {ziehbar && <OrbitControls enablePan={false} enableZoom={false} />}
      </Canvas>
      {label && <span className="absolute left-2 top-1.5 rounded bg-background/80 px-1.5 text-xs font-bold">{label}</span>}
    </div>
  );
}

/** Lernmodus: Würfel mit Pfeil-Knöpfen selbst bewegen und mit dem Zielbild vergleichen. */
export function ProbierWuerfel({ objekte, className }: { objekte: Objekt[]; className?: string }) {
  const [m, setM] = useState<Matrix>(EINHEIT);
  const [folge, setFolge] = useState<Bewegung[]>([]);
  const bewegen = (b: Bewegung) => {
    setM((alt) => mal(BEWEGUNGEN[b], alt));
    setFolge((f) => [...f, b]);
  };
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ObjekteSzene objekte={objekte} drehung={m} animiert label="Probieren" />
      <div className="flex flex-wrap items-center gap-1.5">
        {(["→", "←", "↑", "↓"] as Bewegung[]).map((b) => (
          <button key={b} type="button" onClick={() => bewegen(b)} className="h-10 w-10 rounded-lg border-2 bg-card text-lg font-bold hover:border-primary" aria-label={`Bewegung ${b}`}>
            {b}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setM(EINHEIT);
            setFolge([]);
          }}
          className="h-10 rounded-lg border-2 px-3 text-sm font-semibold"
        >
          Zurück
        </button>
        <span className="ml-1 text-sm text-muted-foreground">{folge.length ? folge.join(" ") : "Noch keine Bewegung"}</span>
      </div>
    </div>
  );
}
