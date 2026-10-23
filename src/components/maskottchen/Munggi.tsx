import type React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MaskottchenVariante } from "@/daten/modelle";
import type { Platz } from "@/munggi/shop";
import { cn } from "@/lib/utils";

export type MunggiZustand = "neutral" | "freut" | "ermutigt" | "muede" | "feiert" | "fokussiert";

// eslint-disable-next-line react-refresh/only-export-components
export const ZUSTAENDE: Array<{ id: MunggiZustand; name: string }> = [
  { id: "neutral", name: "neutral" },
  { id: "freut", name: "freut sich" },
  { id: "ermutigt", name: "ermutigt" },
  { id: "muede", name: "müde (Serie in Gefahr)" },
  { id: "feiert", name: "feiert" },
  { id: "fokussiert", name: "fokussiert" },
];

// eslint-disable-next-line react-refresh/only-export-components
export const VARIANTEN: Array<{ id: MaskottchenVariante; name: string; beschreibung: string }> = [
  { id: "a", name: "Entwurf A – «Munggi rund»", beschreibung: "Rundes, freundliches Murmeltier mit Stirnlampe und Stethoskop um den Hals." },
  { id: "b", name: "Entwurf B – «Bergführer»", beschreibung: "Schlanker und aufrecht wie ein wachsames Murmeltier auf dem Stein, mit rotem Halstuch." },
  { id: "c", name: "Entwurf C – «Minimal»", beschreibung: "Flach und hell, ohne Schattierung – wirkt wie ein App-Icon." },
];

export type Zubehoer = Partial<Record<Platz, string>>;

interface Props {
  zustand?: MunggiZustand;
  variante?: MaskottchenVariante;
  className?: string;
  /** Bewegung (Atmen, Blinzeln, Winken …); aus bei «weniger Bewegung» im System */
  animiert?: boolean;
  titel?: string;
  /** angezogene Gegenstände aus dem Shop (ohne Hintergrund) */
  zubehoer?: Zubehoer;
}

const FARBEN = {
  a: { fell: "#B7773F", fellDunkel: "#8E5A2B", bauch: "#F1D2A8", nase: "#4A2C17", ohrInnen: "#E3B98A" },
  b: { fell: "#9C7A5B", fellDunkel: "#6F5641", bauch: "#E6D3BA", nase: "#3B2A1E", ohrInnen: "#D9B99A" },
  c: { fell: "#C98B4E", fellDunkel: "#B07740", bauch: "#F6E3C6", nase: "#3C2617", ohrInnen: "#F0CFA5" },
};

/* ------------------------------------------------------------------ Bewegungen */

/**
 * Bewegungen als CSS-Animationen (Keyframes «mg-…» in index.css). Jedes Körperteil dreht bzw. bewegt sich
 * um seinen eigenen Drehpunkt (transform-box: fill-box). «Weniger Bewegung» im System schaltet alles ab.
 */
type Anim = [name: string, dauer: number, verzoegerung?: number];

interface Pose {
  figur: Anim;
  koerper: Anim;
  kopf: Anim;
  armL: Anim;
  armR: Anim;
  schwanz: Anim;
  fuss?: Anim;
}

const POSEN: Record<MunggiZustand, Pose> = {
  neutral: { figur: ["mg-wippen", 3], koerper: ["mg-atmen", 3], kopf: ["mg-kopf-pendeln", 7], armL: ["mg-arm-l-schwingen", 3], armR: ["mg-arm-r-schwingen", 3, 0.4], schwanz: ["mg-wedeln", 2.4] },
  freut: { figur: ["mg-huepfen", 0.8], koerper: ["mg-atmen", 0.8], kopf: ["mg-kopf-froh", 0.8], armL: ["mg-arm-l-hoch", 0.4], armR: ["mg-arm-r-hoch", 0.4], schwanz: ["mg-wedeln-schnell", 0.4] },
  feiert: { figur: ["mg-springen", 1.2], koerper: ["mg-atmen", 0.6], kopf: ["mg-kopf-wild", 0.6], armL: ["mg-arm-l-jubel", 0.3], armR: ["mg-arm-r-jubel", 0.3], schwanz: ["mg-wedeln-wild", 0.3], fuss: ["mg-tippen", 0.3] },
  ermutigt: { figur: ["mg-wippen", 1.6], koerper: ["mg-atmen", 1.6], kopf: ["mg-kopf-nicken", 1.6], armL: ["mg-arm-l-schwingen", 1.6], armR: ["mg-arm-r-winken", 0.55], schwanz: ["mg-wedeln", 1] },
  muede: { figur: ["mg-sinken", 4.5], koerper: ["mg-atmen-tief", 4.5], kopf: ["mg-kopf-haengen", 4.5], armL: ["mg-arm-l-haengen", 4.5], armR: ["mg-arm-r-haengen", 4.5], schwanz: ["mg-wedeln-langsam", 4.5] },
  fokussiert: { figur: ["mg-wippen", 4], koerper: ["mg-atmen", 4], kopf: ["mg-kopf-schief", 4], armL: ["mg-arm-l-schwingen", 4], armR: ["mg-arm-r-schreiben", 0.35], schwanz: ["mg-wedeln-langsam", 3] },
};

/**
 * Stil für ein bewegtes Teil. Drehpunkt entweder relativ zum eigenen Umriss («50% 100%» = unten Mitte)
 * oder als Punkt [x, y] in Munggi-Koordinaten (z. B. die Schulter).
 */
function bewegung(anim: Anim | undefined, ursprung: string | [number, number], an: boolean): React.CSSProperties {
  // «view-box»: Bezugspunkt ist der Nullpunkt der Munggi-Koordinaten
  const basis: React.CSSProperties =
    typeof ursprung === "string"
      ? { transformBox: "fill-box", transformOrigin: ursprung }
      : { transformBox: "view-box", transformOrigin: `${ursprung[0]}px ${ursprung[1]}px` };
  if (!an || !anim) return basis;
  const [name, dauer, verz = 0] = anim;
  return { ...basis, animation: `${name} ${dauer}s ease-in-out ${verz}s infinite` };
}

/* ------------------------------------------------------------------ Gesicht */

function Augen({ zustand, flach, bewegt, fell }: { zustand: MunggiZustand; flach: boolean; bewegt: boolean; fell: string }) {
  const x1 = 81;
  const x2 = 119;
  const y = 77;
  const r = 10;
  if (zustand === "freut" || zustand === "feiert")
    return (
      <g stroke="#2B1A0E" strokeWidth={4.5} strokeLinecap="round" fill="none">
        <path d={`M${x1 - r} ${y + 2} Q${x1} ${y - r} ${x1 + r} ${y + 2}`} />
        <path d={`M${x2 - r} ${y + 2} Q${x2} ${y - r} ${x2 + r} ${y + 2}`} />
      </g>
    );
  const blick = zustand === "fokussiert" ? 0 : 1.5;
  return (
    <g style={bewegung(["mg-blinzeln", zustand === "muede" ? 5 : 4], "50% 50%", bewegt)}>
      {[x1, x2].map((x) =>
        flach ? (
          <circle key={x} cx={x} cy={y} r={7} fill="#2B1A0E" />
        ) : (
          <g key={x}>
            <ellipse cx={x} cy={y} rx={r} ry={r * 1.1} fill="#fff" />
            <circle cx={x + blick} cy={y + 1.5} r={r * 0.55} fill="#2B1A0E" />
            <circle cx={x + blick + 2.2} cy={y - 0.5} r={1.8} fill="#fff" />
          </g>
        ),
      )}
      {zustand === "muede" &&
        [x1, x2].map((x) => <path key={`l${x}`} d={`M${x - r - 1} ${y + 1} L${x + r + 1} ${y + 1} L${x + r + 1} ${y - r * 1.3} L${x - r - 1} ${y - r * 1.3} Z`} fill={fell} />)}
      {zustand === "muede" && [x1, x2].map((x) => <path key={`s${x}`} d={`M${x - r} ${y + 1} L${x + r} ${y + 1}`} stroke="#2B1A0E" strokeWidth={1.8} strokeLinecap="round" />)}
    </g>
  );
}

function Brauen({ zustand }: { zustand: MunggiZustand }) {
  const x1 = 81;
  const x2 = 119;
  const y = 62;
  if (zustand === "fokussiert")
    return (
      <g stroke="#3A2414" strokeWidth={3} strokeLinecap="round">
        <path d={`M${x1 - 9} ${y - 3} L${x1 + 7} ${y + 2}`} />
        <path d={`M${x2 + 9} ${y - 3} L${x2 - 7} ${y + 2}`} />
      </g>
    );
  if (zustand === "ermutigt")
    return (
      <g stroke="#3A2414" strokeWidth={3} strokeLinecap="round" fill="none">
        <path d={`M${x1 - 8} ${y} Q${x1} ${y - 6} ${x1 + 8} ${y}`} />
        <path d={`M${x2 - 8} ${y} Q${x2} ${y - 6} ${x2 + 8} ${y}`} />
      </g>
    );
  if (zustand === "muede")
    return (
      <g stroke="#3A2414" strokeWidth={2.5} strokeLinecap="round">
        <path d={`M${x1 - 8} ${y + 1} L${x1 + 7} ${y - 2}`} />
        <path d={`M${x2 + 8} ${y + 1} L${x2 - 7} ${y - 2}`} />
      </g>
    );
  return null;
}

function Mund({ zustand, nase, bewegt }: { zustand: MunggiZustand; nase: string; bewegt: boolean }) {
  const x = 100;
  const y = 101;
  const zaehne = (
    <g>
      <rect x={x - 6} y={y + 1} width={5.5} height={8} rx={1.5} fill="#fff" stroke="#E5D8C8" strokeWidth={0.6} />
      <rect x={x + 0.5} y={y + 1} width={5.5} height={8} rx={1.5} fill="#fff" stroke="#E5D8C8" strokeWidth={0.6} />
    </g>
  );
  if (zustand === "freut" || zustand === "feiert")
    return (
      <g>
        <path d={`M${x - 13} ${y - 1} Q${x} ${y + 20} ${x + 13} ${y - 1} Z`} fill="#6B2A1A" />
        <path d={`M${x - 7} ${y + 8} Q${x} ${y + 15} ${x + 7} ${y + 8} Q${x} ${y + 5} ${x - 7} ${y + 8}`} fill="#E86B6B" />
        <rect x={x - 6} y={y - 1} width={5.5} height={6} rx={1.2} fill="#fff" />
        <rect x={x + 0.5} y={y - 1} width={5.5} height={6} rx={1.2} fill="#fff" />
      </g>
    );
  if (zustand === "muede")
    // gelegentliches Gähnen
    return (
      <motion.ellipse
        cx={x}
        cy={y + 5}
        rx={6}
        fill="#6B2A1A"
        initial={{ ry: 1.5 }}
        animate={bewegt ? { ry: [1.5, 1.5, 8, 8, 1.5], transition: { duration: 7, times: [0, 0.6, 0.7, 0.85, 1], repeat: Infinity } } : { ry: 1.5 }}
      />
    );
  if (zustand === "fokussiert")
    return (
      <g>
        <path d={`M${x - 6} ${y} L${x + 6} ${y}`} stroke={nase} strokeWidth={2.2} strokeLinecap="round" />
        {zaehne}
      </g>
    );
  return (
    <g>
      <path d={`M${x - 10} ${y - 2} Q${x - 5} ${y + 3} ${x} ${y - 1} Q${x + 5} ${y + 3} ${x + 10} ${y - 2}`} stroke={nase} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      {zaehne}
    </g>
  );
}

function Lampe({ zustand, bewegt }: { zustand: MunggiZustand; bewegt: boolean }) {
  const an = zustand !== "muede";
  const strahl = zustand === "fokussiert" || zustand === "feiert";
  return (
    <g>
      {an && strahl && (
        <path d="M100 44 L30 -16 L170 -16 Z" fill="#FFE28A" opacity={0.4} style={bewegt ? { animation: "mg-strahl 1.6s ease-in-out infinite" } : undefined} />
      )}
      <rect x={88} y={35} width={24} height={18} rx={5} fill="#36424E" />
      <circle cx={100} cy={44} r={6.5} fill={an ? "#FFD34D" : "#9AA5B1"} stroke={an ? "#FFF3C2" : "#7B8794"} strokeWidth={1.5} style={an && bewegt ? { animation: "mg-leuchten 2.2s ease-in-out infinite" } : undefined} />
    </g>
  );
}

/* ------------------------------------------------------------------ Zubehör */

function Kopfbedeckung({ id }: { id?: string }) {
  switch (id) {
    case "zipfelmuetze":
      return (
        <g>
          <path d="M64 36 Q70 6 112 2 Q150 -2 158 -10 Q148 14 136 36 Z" fill="#D7263D" />
          <circle cx={159} cy={-10} r={8} fill="#fff" />
          <rect x={60} y={28} width={80} height={12} rx={6} fill="#fff" />
        </g>
      );
    case "chaeppi":
      return (
        <g>
          <path d="M64 38 Q66 6 100 6 Q134 6 136 38 Z" fill="#1C7ED6" />
          <circle cx={100} cy={8} r={3.5} fill="#1864AB" />
          <path d="M124 36 Q160 32 170 40 Q150 44 124 42 Z" fill="#1864AB" />
        </g>
      );
    case "sennenhut":
      return (
        <g>
          <ellipse cx={100} cy={36} rx={60} ry={9} fill="#5C4033" />
          <path d="M72 36 L76 8 Q100 0 124 8 L128 36 Z" fill="#6F4E37" />
          <rect x={73} y={26} width={54} height={6} fill="#2F3A45" />
          <g transform="translate(120 24)">
            {[0, 60, 120, 180, 240, 300].map((w) => (
              <ellipse key={w} cx={0} cy={-5} rx={2.6} ry={5} fill="#F8F9FA" transform={`rotate(${w})`} />
            ))}
            <circle r={2.4} fill="#FFD43B" />
          </g>
        </g>
      );
    case "doktorhut":
      return (
        <g>
          <path d="M72 38 L72 22 Q100 30 128 22 L128 38 Z" fill="#212529" />
          <path d="M36 20 L100 2 L164 20 L100 38 Z" fill="#343A40" />
          <path d="M100 20 L150 26 L150 46" stroke="#FFD43B" strokeWidth={2.5} fill="none" />
          <rect x={146} y={44} width={8} height={12} rx={2} fill="#FFD43B" />
        </g>
      );
    case "krone":
      return (
        <g>
          <path d="M64 38 L60 6 L80 22 L100 0 L120 22 L140 6 L136 38 Z" fill="#FCC419" stroke="#E67700" strokeWidth={2} />
          <circle cx={100} cy={26} r={4.5} fill="#E03131" />
          <circle cx={78} cy={30} r={3} fill="#1C7ED6" />
          <circle cx={122} cy={30} r={3} fill="#2F9E44" />
        </g>
      );
    default:
      return null;
  }
}

function Augenzubehoer({ id }: { id?: string }) {
  switch (id) {
    case "brille":
      return (
        <g fill="none" stroke="#3B2A1E" strokeWidth={3}>
          <circle cx={81} cy={77} r={14} />
          <circle cx={119} cy={77} r={14} />
          <path d="M95 75 Q100 71 105 75" />
        </g>
      );
    case "sonnenbrille":
      return (
        <g>
          <rect x={63} y={67} width={34} height={22} rx={9} fill="#212529" />
          <rect x={103} y={67} width={34} height={22} rx={9} fill="#212529" />
          <path d="M97 74 L103 74" stroke="#212529" strokeWidth={3} />
          <path d="M68 72 L78 72" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
          <path d="M108 72 L118 72" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
        </g>
      );
    case "laborbrille":
      return (
        <g>
          <path d="M48 76 L62 74 M138 74 L152 76" stroke="#495057" strokeWidth={3} />
          <rect x={60} y={63} width={80} height={28} rx={12} fill="#A5D8FF" opacity={0.45} stroke="#1971C2" strokeWidth={3} />
        </g>
      );
    default:
      return null;
  }
}

function Halszubehoer({ id }: { id?: string }) {
  switch (id) {
    case "halstuch":
      return <path d="M64 110 Q100 126 136 110 L100 142 Z" fill="#1C7ED6" stroke="#1864AB" strokeWidth={1.5} />;
    case "fliege":
      return (
        <g fill="#C92A2A">
          <path d="M100 118 L78 106 L78 130 Z" />
          <path d="M100 118 L122 106 L122 130 Z" />
          <circle cx={100} cy={118} r={5} fill="#A61E1E" />
        </g>
      );
    case "schal":
      return (
        <g>
          <path d="M58 108 Q100 128 142 108 L142 120 Q100 140 58 120 Z" fill="#E03131" />
          <rect x={118} y={116} width={18} height={40} rx={4} fill="#E03131" />
          <path d="M127 128 L127 144 M119 136 L135 136" stroke="#fff" strokeWidth={4} />
        </g>
      );
    case "medaille":
      return (
        <g>
          <path d="M80 108 L100 146 L120 108" stroke="#1C7ED6" strokeWidth={6} fill="none" />
          <circle cx={100} cy={152} r={11} fill="#FCC419" stroke="#E67700" strokeWidth={2} />
          <path d="M100 145 L102 150 L107 150 L103 153 L105 158 L100 155 L95 158 L97 153 L93 150 L98 150 Z" fill="#E67700" />
        </g>
      );
    default:
      return null;
  }
}

/** Gegenstand in der rechten Pfote (wird mit dem Arm bewegt) */
function Pfotenzubehoer({ id }: { id?: string }) {
  switch (id) {
    case "bleistift":
      return (
        <g transform="rotate(-30 156 160)">
          <rect x={152} y={136} width={8} height={36} fill="#FCC419" />
          <path d="M152 172 L160 172 L156 182 Z" fill="#F1D2A8" />
          <path d="M155 179 L157 179 L156 182 Z" fill="#212529" />
          <rect x={152} y={132} width={8} height={5} fill="#F783AC" />
        </g>
      );
    case "buch":
      return (
        <g>
          <rect x={142} y={150} width={30} height={22} rx={2} fill="#2F9E44" transform="rotate(-12 157 161)" />
          <rect x={145} y={153} width={24} height={4} fill="#fff" opacity={0.7} transform="rotate(-12 157 161)" />
          <path d="M162 148 L162 158" stroke="#E03131" strokeWidth={3} transform="rotate(-12 157 161)" />
        </g>
      );
    case "edelweiss":
      return (
        <g>
          <path d="M156 168 Q160 150 158 130" stroke="#2F9E44" strokeWidth={3} fill="none" />
          <g transform="translate(158 128)">
            {[0, 72, 144, 216, 288].map((w) => (
              <ellipse key={w} cx={0} cy={-7} rx={3.5} ry={7} fill="#F8F9FA" stroke="#CED4DA" strokeWidth={0.6} transform={`rotate(${w})`} />
            ))}
            <circle r={3.2} fill="#FFD43B" />
          </g>
        </g>
      );
    case "reagenzglas":
      return (
        <g transform="rotate(15 158 150)">
          <rect x={152} y={126} width={12} height={40} rx={6} fill="#E7F5FF" stroke="#868E96" strokeWidth={1.5} />
          <rect x={153.5} y={146} width={9} height={18} rx={4.5} fill="#51CF66" />
          <circle cx={158} cy={140} r={2} fill="#8CE99A" />
          <circle cx={156} cy={133} r={1.4} fill="#8CE99A" />
          <rect x={150} y={124} width={16} height={4} rx={2} fill="#868E96" />
        </g>
      );
    default:
      return null;
  }
}

function Konfetti({ bewegt }: { bewegt: boolean }) {
  const stuecke = [
    [30, 40, "#FF6B6B"],
    [170, 36, "#4DABF7"],
    [20, 100, "#FFD43B"],
    [182, 92, "#51CF66"],
    [46, 18, "#845EF7"],
    [152, 16, "#FF922B"],
  ] as const;
  return (
    <g>
      {stuecke.map(([x, y, f], i) => (
        <rect key={i} x={x} y={y} width={7} height={11} rx={2} fill={f} style={{ transformBox: "fill-box", transformOrigin: "50% 50%", animation: bewegt ? `mg-konfetti ${1.4 + i * 0.15}s linear infinite` : undefined }} />
      ))}
    </g>
  );
}

function Zzz({ bewegt }: { bewegt: boolean }) {
  return (
    <g fill="#7B8794" fontFamily="sans-serif" fontWeight={800} style={bewegt ? { animation: "mg-zzz 2.8s ease-out infinite" } : undefined}>
      <text x={150} y={40} fontSize={18}>
        z
      </text>
      <text x={164} y={24} fontSize={14}>
        z
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ Figur */

/**
 * Munggi, das Murmeltier mit Stirnlampe und Stethoskop. Bewegliche Teile: Körper (atmet), Kopf (neigt sich),
 * Ohren (zucken), Augen (blinzeln), Arme (winken), Schwanz (wedelt) und Füsse (tippen beim Feiern).
 */
export function Munggi({ zustand = "neutral", variante = "a", className, animiert = true, titel, zubehoer = {} }: Props) {
  const reduziert = useReducedMotion();
  const bewegt = animiert && !reduziert;
  const f = FARBEN[variante];
  const pose = POSEN[zustand];
  const schlank = variante === "b";
  const flach = variante === "c";
  const bauchRx = schlank ? 46 : 58;

  return (
    <svg
      viewBox="-10 -24 220 224"
      role="img"
      aria-label={titel ?? `Munggi (${ZUSTAENDE.find((z) => z.id === zustand)?.name})`}
      className={cn("munggi h-24 w-24 overflow-visible", className)}
    >
      {/* Schatten wird kleiner, wenn Munggi springt */}
      <motion.ellipse
        cx={100}
        cy={190}
        rx={52}
        ry={7}
        fill="#000"
        opacity={0.12}
        animate={bewegt && zustand === "feiert" ? { rx: [52, 38, 52, 38, 52], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } } : undefined}
      />
      {schlank && <path d="M40 186 Q100 170 160 186 L160 194 L40 194 Z" fill="#A7AFB8" />}

      <g style={bewegung(pose.figur, [100, 190], bewegt)}>
        {/* Schwanz hinter dem Körper */}
        <g style={bewegung(pose.schwanz, [146, 178], bewegt)}>
          <ellipse cx={156} cy={162} rx={14} ry={24} fill={f.fellDunkel} transform="rotate(35 156 162)" />
        </g>

        {/* Füsse */}
        <ellipse cx={78} cy={183} rx={17} ry={8} fill={f.fellDunkel} style={bewegung(pose.fuss, "50% 100%", bewegt)} />
        <ellipse cx={122} cy={183} rx={17} ry={8} fill={f.fellDunkel} style={bewegung(pose.fuss && [pose.fuss[0], pose.fuss[1], 0.15], "50% 100%", bewegt)} />

        {/* Körper atmet */}
        <g style={bewegung(pose.koerper, [100, 188], bewegt)}>
          {flach ? (
            <rect x={100 - bauchRx} y={88} width={bauchRx * 2} height={100} rx={44} fill={f.fell} />
          ) : (
            <ellipse cx={100} cy={136} rx={bauchRx} ry={52} fill={f.fell} />
          )}
          <ellipse cx={100} cy={148} rx={schlank ? 28 : 36} ry={34} fill={f.bauch} />
          {schlank && (
            <g>
              <path d="M66 106 Q100 126 134 106 L130 118 Q100 134 70 118 Z" fill="#D7263D" />
              <path d="M96 120 L104 120 L108 140 L92 140 Z" fill="#B71C30" />
            </g>
          )}
          {/* Stethoskop */}
          <g fill="none" strokeLinecap="round">
            <path d="M70 112 Q72 130 100 134 Q128 130 130 112" stroke="#5C6773" strokeWidth={4} />
            <path d="M116 128 Q122 142 116 150" stroke="#5C6773" strokeWidth={3.5} />
            <circle cx={116} cy={155} r={7} fill="#D5DCE3" stroke="#8A96A3" strokeWidth={2.5} />
          </g>
          <Halszubehoer id={zubehoer.hals} />
        </g>

        {/* Arme: drehen um die Schulter */}
        <g style={bewegung(pose.armL, [schlank ? 66 : 54, 120], bewegt)}>
          <ellipse cx={schlank ? 66 : 54} cy={140} rx={11} ry={22} fill={f.fellDunkel} />
        </g>
        <g style={bewegung(pose.armR, [schlank ? 134 : 146, 120], bewegt)}>
          <ellipse cx={schlank ? 134 : 146} cy={140} rx={11} ry={22} fill={f.fellDunkel} />
          <g transform={schlank ? "translate(-12 0)" : undefined}>
            <Pfotenzubehoer id={zubehoer.hand} />
          </g>
        </g>

        {/* Kopf neigt sich um den Hals */}
        <g style={bewegung(pose.kopf, [100, 122], bewegt)}>
          <g style={bewegung(["mg-ohr-zucken", 5, 0], [60, 56], bewegt)}>
            <circle cx={60} cy={44} r={13} fill={f.fellDunkel} />
            <circle cx={60} cy={44} r={6.5} fill={f.ohrInnen} />
          </g>
          <g style={bewegung(["mg-ohr-zucken", 5, 1.3], [140, 56], bewegt)}>
            <circle cx={140} cy={44} r={13} fill={f.fellDunkel} />
            <circle cx={140} cy={44} r={6.5} fill={f.ohrInnen} />
          </g>
          <ellipse cx={100} cy={80} rx={53} ry={46} fill={f.fell} />
          <path d="M50 62 Q100 34 150 62" stroke="#2F3A45" strokeWidth={7} fill="none" strokeLinecap="round" />
          <Lampe zustand={zustand} bewegt={bewegt} />
          <ellipse cx={100} cy={100} rx={30} ry={21} fill={f.bauch} />
          {(zustand === "freut" || zustand === "feiert") && (
            <g fill="#F28B82" opacity={0.6}>
              <ellipse cx={66} cy={96} rx={8} ry={5} />
              <ellipse cx={134} cy={96} rx={8} ry={5} />
            </g>
          )}
          <Brauen zustand={zustand} />
          <Augen zustand={zustand} flach={flach} bewegt={bewegt} fell={f.fell} />
          <path d="M93 89 Q100 85 107 89 Q104 96 100 97 Q96 96 93 89 Z" fill={f.nase} />
          <Mund zustand={zustand} nase={f.nase} bewegt={bewegt} />
          <Augenzubehoer id={zubehoer.augen} />
          <Kopfbedeckung id={zubehoer.kopf} />
        </g>
      </g>

      {zustand === "feiert" && <Konfetti bewegt={bewegt} />}
      {zustand === "muede" && <Zzz bewegt={bewegt} />}
    </svg>
  );
}
