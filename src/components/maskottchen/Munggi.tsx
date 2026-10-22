import { motion } from "framer-motion";
import type { MaskottchenVariante } from "@/daten/modelle";
import { cn } from "@/lib/utils";

export type MunggiZustand = "neutral" | "freut" | "ermutigt" | "muede" | "feiert" | "fokussiert";

// eslint-disable-next-line react-refresh/only-export-components
export const ZUSTAENDE: Array<{ id: MunggiZustand; name: string }> = [
  { id: "neutral", name: "neutral" },
  { id: "freut", name: "freut sich" },
  { id: "ermutigt", name: "ermutigt" },
  { id: "muede", name: "müde (Streak in Gefahr)" },
  { id: "feiert", name: "feiert" },
  { id: "fokussiert", name: "fokussiert" },
];

// eslint-disable-next-line react-refresh/only-export-components
export const VARIANTEN: Array<{ id: MaskottchenVariante; name: string; beschreibung: string }> = [
  { id: "a", name: "Entwurf A – «Munggi rund»", beschreibung: "Rundes, freundliches Murmeltier mit Stirnlampe und Stethoskop um den Hals." },
  { id: "b", name: "Entwurf B – «Bergführer»", beschreibung: "Schlanker, aufrecht wie ein wachsames Murmeltier auf dem Stein, mit rotem Halstuch." },
  { id: "c", name: "Entwurf C – «Minimal»", beschreibung: "Flach und geometrisch, wirkt wie ein App-Icon." },
];

interface Props {
  zustand?: MunggiZustand;
  variante?: MaskottchenVariante;
  className?: string;
  /** sanftes Wippen */
  animiert?: boolean;
  titel?: string;
}

const FARBEN = {
  a: { fell: "#B7773F", fellDunkel: "#8E5A2B", bauch: "#F1D2A8", nase: "#4A2C17" },
  b: { fell: "#9C7A5B", fellDunkel: "#6F5641", bauch: "#E6D3BA", nase: "#3B2A1E" },
  c: { fell: "#C98B4E", fellDunkel: "#A26B37", bauch: "#F6E3C6", nase: "#3C2617" },
};

function Augen({ zustand, x1, x2, y, r, farbe }: { zustand: MunggiZustand; x1: number; x2: number; y: number; r: number; farbe: string }) {
  if (zustand === "freut" || zustand === "feiert") {
    return (
      <g stroke="#2B1A0E" strokeWidth={r * 0.45} strokeLinecap="round" fill="none">
        <path d={`M${x1 - r} ${y + 2} Q${x1} ${y - r} ${x1 + r} ${y + 2}`} />
        <path d={`M${x2 - r} ${y + 2} Q${x2} ${y - r} ${x2 + r} ${y + 2}`} />
      </g>
    );
  }
  const blick = zustand === "fokussiert" ? 0 : 1.5;
  return (
    <g>
      {[x1, x2].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 1.1} fill="#fff" />
          <circle cx={x + blick} cy={y + 1.5} r={r * 0.55} fill="#2B1A0E" />
          <circle cx={x + blick + r * 0.22} cy={y - r * 0.05} r={r * 0.18} fill="#fff" />
          {zustand === "muede" && <path d={`M${x - r - 1} ${y + 1} L${x + r + 1} ${y + 1} L${x + r + 1} ${y - r * 1.3} L${x - r - 1} ${y - r * 1.3} Z`} fill={farbe} />}
          {zustand === "muede" && <path d={`M${x - r} ${y + 1} L${x + r} ${y + 1}`} stroke="#2B1A0E" strokeWidth={1.6} strokeLinecap="round" />}
        </g>
      ))}
    </g>
  );
}

function Brauen({ zustand, x1, x2, y }: { zustand: MunggiZustand; x1: number; x2: number; y: number }) {
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

function Mund({ zustand, x, y, nase }: { zustand: MunggiZustand; x: number; y: number; nase: string }) {
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
    return (
      <g>
        <path d={`M${x - 8} ${y + 2} Q${x} ${y} ${x + 8} ${y + 2}`} stroke={nase} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      </g>
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

function Lampe({ x, y, an, strahl = false, gross = 1 }: { x: number; y: number; an: boolean; strahl?: boolean; gross?: number }) {
  return (
    <g>
      {an && strahl && <path d={`M${x} ${y} L${x - 70 * gross} ${y - 60 * gross} L${x + 70 * gross} ${y - 60 * gross} Z`} fill="#FFE28A" opacity={0.45} />}
      <rect x={x - 12 * gross} y={y - 9 * gross} width={24 * gross} height={18 * gross} rx={5 * gross} fill="#36424E" />
      <circle cx={x} cy={y} r={6.5 * gross} fill={an ? "#FFD34D" : "#9AA5B1"} stroke={an ? "#FFF3C2" : "#7B8794"} strokeWidth={1.5} />
    </g>
  );
}

function Konfetti() {
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
        <rect key={i} x={x} y={y} width={7} height={11} rx={2} fill={f} transform={`rotate(${i * 37} ${x} ${y})`} />
      ))}
    </g>
  );
}

function Zzz() {
  return (
    <g fill="#7B8794" fontFamily="sans-serif" fontWeight={800}>
      <text x={150} y={40} fontSize={18}>
        z
      </text>
      <text x={164} y={24} fontSize={14}>
        z
      </text>
    </g>
  );
}

function Stethoskop({ x, y, breite, tief }: { x: number; y: number; breite: number; tief: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={`M${x - breite} ${y} Q${x - breite + 2} ${y + tief} ${x} ${y + tief + 4} Q${x + breite - 2} ${y + tief} ${x + breite} ${y}`} stroke="#5C6773" strokeWidth={4} />
      <path d={`M${x + breite * 0.55} ${y + tief - 2} Q${x + breite * 0.75} ${y + tief + 14} ${x + breite * 0.55} ${y + tief + 22}`} stroke="#5C6773" strokeWidth={3.5} />
      <circle cx={x + breite * 0.55} cy={y + tief + 27} r={7} fill="#D5DCE3" stroke="#8A96A3" strokeWidth={2.5} />
    </g>
  );
}

function Pfoten({ zustand, xL, xR, y, farbe }: { zustand: MunggiZustand; xL: number; xR: number; y: number; farbe: string }) {
  if (zustand === "feiert")
    return (
      <g fill={farbe}>
        <ellipse cx={xL - 6} cy={y - 48} rx={11} ry={18} transform={`rotate(-25 ${xL - 6} ${y - 48})`} />
        <ellipse cx={xR + 6} cy={y - 48} rx={11} ry={18} transform={`rotate(25 ${xR + 6} ${y - 48})`} />
      </g>
    );
  if (zustand === "ermutigt")
    return (
      <g fill={farbe}>
        <ellipse cx={xL} cy={y} rx={11} ry={17} />
        <ellipse cx={xR + 4} cy={y - 30} rx={11} ry={16} transform={`rotate(20 ${xR + 4} ${y - 30})`} />
        <ellipse cx={xR + 8} cy={y - 46} rx={4.5} ry={8} />
      </g>
    );
  if (zustand === "freut")
    return (
      <g fill={farbe}>
        <ellipse cx={xL + 4} cy={y - 14} rx={11} ry={16} transform={`rotate(-30 ${xL + 4} ${y - 14})`} />
        <ellipse cx={xR - 4} cy={y - 14} rx={11} ry={16} transform={`rotate(30 ${xR - 4} ${y - 14})`} />
      </g>
    );
  return (
    <g fill={farbe}>
      <ellipse cx={xL} cy={y} rx={11} ry={17} />
      <ellipse cx={xR} cy={y} rx={11} ry={17} />
    </g>
  );
}

function EntwurfA({ zustand }: { zustand: MunggiZustand }) {
  const f = FARBEN.a;
  const lampeAn = zustand !== "muede";
  return (
    <g>
      <ellipse cx={100} cy={190} rx={52} ry={7} fill="#000" opacity={0.12} />
      <ellipse cx={78} cy={183} rx={17} ry={8} fill={f.fellDunkel} />
      <ellipse cx={122} cy={183} rx={17} ry={8} fill={f.fellDunkel} />
      <ellipse cx={100} cy={136} rx={58} ry={52} fill={f.fell} />
      <ellipse cx={100} cy={148} rx={36} ry={34} fill={f.bauch} />
      <Pfoten zustand={zustand} xL={50} xR={150} y={142} farbe={f.fellDunkel} />
      <Stethoskop x={100} y={112} breite={30} tief={18} />
      <circle cx={60} cy={44} r={13} fill={f.fellDunkel} />
      <circle cx={60} cy={44} r={6.5} fill="#E3B98A" />
      <circle cx={140} cy={44} r={13} fill={f.fellDunkel} />
      <circle cx={140} cy={44} r={6.5} fill="#E3B98A" />
      <ellipse cx={100} cy={80} rx={53} ry={46} fill={f.fell} />
      <path d="M50 62 Q100 34 150 62" stroke="#2F3A45" strokeWidth={7} fill="none" strokeLinecap="round" />
      <Lampe x={100} y={44} an={lampeAn} strahl={zustand === "fokussiert" || zustand === "feiert"} />
      <ellipse cx={100} cy={100} rx={30} ry={21} fill={f.bauch} />
      {(zustand === "freut" || zustand === "feiert") && (
        <g fill="#F28B82" opacity={0.6}>
          <ellipse cx={66} cy={96} rx={8} ry={5} />
          <ellipse cx={134} cy={96} rx={8} ry={5} />
        </g>
      )}
      <Brauen zustand={zustand} x1={81} x2={119} y={62} />
      <Augen zustand={zustand} x1={81} x2={119} y={77} r={10} farbe={f.fell} />
      <path d="M93 89 Q100 85 107 89 Q104 96 100 97 Q96 96 93 89 Z" fill={f.nase} />
      <Mund zustand={zustand} x={100} y={101} nase={f.nase} />
      {zustand === "feiert" && <Konfetti />}
      {zustand === "muede" && <Zzz />}
    </g>
  );
}

function EntwurfB({ zustand }: { zustand: MunggiZustand }) {
  const f = FARBEN.b;
  return (
    <g>
      <path d="M40 186 Q100 168 160 186 L160 194 L40 194 Z" fill="#A7AFB8" />
      <ellipse cx={100} cy={186} rx={60} ry={6} fill="#000" opacity={0.1} />
      <ellipse cx={84} cy={180} rx={14} ry={7} fill={f.fellDunkel} />
      <ellipse cx={116} cy={180} rx={14} ry={7} fill={f.fellDunkel} />
      <path d="M58 180 Q54 120 72 98 L128 98 Q146 120 142 180 Z" fill={f.fell} />
      <ellipse cx={100} cy={146} rx={26} ry={34} fill={f.bauch} />
      <path d="M70 104 Q100 124 130 104 L126 116 Q100 132 74 116 Z" fill="#D7263D" />
      <path d="M96 118 L104 118 L108 138 L92 138 Z" fill="#B71C30" />
      <Pfoten zustand={zustand} xL={62} xR={138} y={140} farbe={f.fellDunkel} />
      <Stethoskop x={100} y={122} breite={22} tief={14} />
      <circle cx={70} cy={42} r={9} fill={f.fellDunkel} />
      <circle cx={130} cy={42} r={9} fill={f.fellDunkel} />
      <ellipse cx={100} cy={72} rx={40} ry={38} fill={f.fell} />
      <path d="M62 56 Q100 30 138 56" stroke="#2F3A45" strokeWidth={6} fill="none" strokeLinecap="round" />
      <Lampe x={100} y={40} an={zustand !== "muede"} strahl={zustand === "fokussiert" || zustand === "feiert"} gross={0.9} />
      <ellipse cx={100} cy={90} rx={24} ry={17} fill={f.bauch} />
      <Brauen zustand={zustand} x1={84} x2={116} y={58} />
      <Augen zustand={zustand} x1={84} x2={116} y={71} r={8.5} farbe={f.fell} />
      <path d="M94 82 Q100 78 106 82 Q103 88 100 89 Q97 88 94 82 Z" fill={f.nase} />
      <Mund zustand={zustand} x={100} y={93} nase={f.nase} />
      {zustand === "feiert" && <Konfetti />}
      {zustand === "muede" && <Zzz />}
    </g>
  );
}

function EntwurfC({ zustand }: { zustand: MunggiZustand }) {
  const f = FARBEN.c;
  const froh = zustand === "freut" || zustand === "feiert";
  return (
    <g>
      <rect x={40} y={20} width={120} height={160} rx={48} fill={f.fell} />
      <rect x={66} y={104} width={68} height={66} rx={30} fill={f.bauch} />
      <circle cx={52} cy={30} r={12} fill={f.fellDunkel} />
      <circle cx={148} cy={30} r={12} fill={f.fellDunkel} />
      <rect x={40} y={46} width={120} height={9} fill="#2F3A45" />
      <Lampe x={100} y={50} an={zustand !== "muede"} strahl={zustand === "fokussiert" || zustand === "feiert"} gross={1.05} />
      {froh ? (
        <g stroke="#2B1A0E" strokeWidth={5} strokeLinecap="round" fill="none">
          <path d="M70 84 Q78 74 86 84" />
          <path d="M114 84 Q122 74 130 84" />
        </g>
      ) : (
        <g fill="#2B1A0E">
          <circle cx={78} cy={82} r={zustand === "muede" ? 0 : 7} />
          <circle cx={122} cy={82} r={zustand === "muede" ? 0 : 7} />
          {zustand === "muede" && (
            <g stroke="#2B1A0E" strokeWidth={4} strokeLinecap="round">
              <path d="M70 84 L86 84" />
              <path d="M114 84 L130 84" />
            </g>
          )}
        </g>
      )}
      <Brauen zustand={zustand} x1={78} x2={122} y={68} />
      <rect x={92} y={92} width={16} height={9} rx={4.5} fill={f.nase} />
      <rect x={93} y={104} width={6} height={9} rx={1.5} fill="#fff" />
      <rect x={101} y={104} width={6} height={9} rx={1.5} fill="#fff" />
      <path d="M70 118 Q100 140 130 118" stroke="#5C6773" strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={118} cy={142} r={7} fill="#D5DCE3" stroke="#8A96A3" strokeWidth={2.5} />
      {zustand === "feiert" && <Konfetti />}
      {zustand === "muede" && <Zzz />}
      {zustand === "ermutigt" && <path d="M150 120 l8 -16 l6 3 l-4 12 l10 0 l0 8 l-20 2 Z" fill={f.fellDunkel} />}
    </g>
  );
}

export function Munggi({ zustand = "neutral", variante = "a", className, animiert = true, titel }: Props) {
  const inhalt = variante === "b" ? <EntwurfB zustand={zustand} /> : variante === "c" ? <EntwurfC zustand={zustand} /> : <EntwurfA zustand={zustand} />;
  const bewegung =
    !animiert
      ? undefined
      : zustand === "feiert"
        ? { y: [0, -10, 0], rotate: [0, -3, 3, 0] }
        : zustand === "muede"
          ? { y: [0, 2, 0] }
          : { y: [0, -3, 0] };
  return (
    <motion.svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={titel ?? `Munggi (${ZUSTAENDE.find((z) => z.id === zustand)?.name})`}
      className={cn("h-24 w-24 overflow-visible", className)}
      animate={bewegung}
      transition={bewegung ? { duration: zustand === "feiert" ? 0.9 : 2.6, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {inhalt}
    </motion.svg>
  );
}
