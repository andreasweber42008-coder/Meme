import type { Zelle } from "@/aufgaben/konz";

const S = 24; // Kantenlänge im viewBox
const R = 3; // Rand

/** Unsymmetrisches Grundzeichen für K3 (Drehung/Spiegelung gut erkennbar) */
const K3_PFAD = "M7 5 H17 V9 H11 V12 H15 V15 H11 V19 H7 Z";

function K5Linien({ teile, muster }: { teile: number; muster: number }) {
  const a = R;
  const b = S - R;
  const m = S / 2;
  const d = (S - 2 * R) / 3;
  const q = (S - 2 * R) / 4;
  const varianten: Record<number, Array<[number, number, number, number]>[]> = {
    2: [[[m, a, m, b]], [[a, m, b, m]], [[a, a, b, b]], [[a, b, b, a]]],
    3: [
      [[a + d, a, a + d, b], [a + 2 * d, a, a + 2 * d, b]],
      [[a, a + d, b, a + d], [a, a + 2 * d, b, a + 2 * d]],
      [[m, a, m, b], [m, m, b, m]],
      [[a, m, b, m], [m, a, m, m]],
    ],
    4: [
      [[m, a, m, b], [a, m, b, m]],
      [[a, a, b, b], [a, b, b, a]],
      [[a + q, a, a + q, b], [a + 2 * q, a, a + 2 * q, b], [a + 3 * q, a, a + 3 * q, b]],
      [[a, a + q, b, a + q], [a, a + 2 * q, b, a + 2 * q], [a, a + 3 * q, b, a + 3 * q]],
    ],
  };
  const linien = varianten[teile]?.[muster % 4] ?? [];
  return (
    <>
      {linien.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.2} />
      ))}
    </>
  );
}

export function KonzZeichen({ zelle, className }: { zelle: Zelle; className?: string }) {
  const rahmen = (
    <rect x={R} y={R} width={S - 2 * R} height={S - 2 * R} fill="none" stroke="currentColor" strokeWidth={1.1} />
  );
  let inhalt: React.ReactNode = null;
  switch (zelle.f) {
    case "K1": {
      const [o, r, u, l] = zelle.seiten;
      inhalt = (
        <>
          {o && <line x1={R} y1={R} x2={S - R} y2={R} stroke="currentColor" strokeWidth={1.4} />}
          {r && <line x1={S - R} y1={R} x2={S - R} y2={S - R} stroke="currentColor" strokeWidth={1.4} />}
          {u && <line x1={R} y1={S - R} x2={S - R} y2={S - R} stroke="currentColor" strokeWidth={1.4} />}
          {l && <line x1={R} y1={R} x2={R} y2={S - R} stroke="currentColor" strokeWidth={1.4} />}
          <text x={S / 2} y={S / 2 + 4.2} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor">
            {zelle.zahl}
          </text>
        </>
      );
      break;
    }
    case "K2":
      inhalt = (
        <text x={S / 2} y={S / 2 + 5.5} textAnchor="middle" fontSize={16} fontWeight={700} fill="currentColor">
          {zelle.zahl}
        </text>
      );
      break;
    case "K3":
      inhalt = (
        <g transform={`rotate(${zelle.dreh * 90} ${S / 2} ${S / 2})${zelle.spiegel ? ` translate(${S} 0) scale(-1 1)` : ""}`}>
          <path d={K3_PFAD} fill="currentColor" />
        </g>
      );
      break;
    case "K4":
      inhalt = (
        <>
          {rahmen}
          {zelle.linien.map((durch, i) => {
            const y = R + 3 + i * 4.3;
            return durch ? (
              <line key={i} x1={R + 2} y1={y} x2={S - R - 2} y2={y} stroke="currentColor" strokeWidth={1.2} />
            ) : (
              <g key={i}>
                <line x1={R + 2} y1={y} x2={S / 2 - 1.6} y2={y} stroke="currentColor" strokeWidth={1.2} />
                <line x1={S / 2 + 1.6} y1={y} x2={S - R - 2} y2={y} stroke="currentColor" strokeWidth={1.2} />
              </g>
            );
          })}
        </>
      );
      break;
    case "K5":
      inhalt = (
        <>
          {rahmen}
          <K5Linien teile={zelle.teile} muster={zelle.muster} />
        </>
      );
      break;
    case "K6": {
      const [o, r, u, l] = zelle.dick;
      const w = (d: boolean) => (d ? 2.6 : 0.8);
      inhalt = (
        <>
          <line x1={R} y1={R} x2={S - R} y2={R} stroke="currentColor" strokeWidth={w(o)} strokeLinecap="square" />
          <line x1={S - R} y1={R} x2={S - R} y2={S - R} stroke="currentColor" strokeWidth={w(r)} strokeLinecap="square" />
          <line x1={R} y1={S - R} x2={S - R} y2={S - R} stroke="currentColor" strokeWidth={w(u)} strokeLinecap="square" />
          <line x1={R} y1={R} x2={R} y2={S - R} stroke="currentColor" strokeWidth={w(l)} strokeLinecap="square" />
        </>
      );
      break;
    }
    case "B1":
      inhalt = (
        <>
          {Array.from({ length: zelle.oben }, (_, i) => (
            <line key={`o${i}`} x1={9 + i * 6 - (zelle.oben - 1) * 3 + 3} y1={2} x2={9 + i * 6 - (zelle.oben - 1) * 3 + 3} y2={6} stroke="currentColor" strokeWidth={1.2} />
          ))}
          <text x={S / 2} y={S / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={600} fill="currentColor" fontFamily="Arial, sans-serif">
            {zelle.buchstabe}
          </text>
          {Array.from({ length: zelle.unten }, (_, i) => (
            <line key={`u${i}`} x1={9 + i * 6 - (zelle.unten - 1) * 3 + 3} y1={S - 6} x2={9 + i * 6 - (zelle.unten - 1) * 3 + 3} y2={S - 2} stroke="currentColor" strokeWidth={1.2} />
          ))}
        </>
      );
      break;
  }
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className={className} aria-hidden="true">
      {inhalt}
    </svg>
  );
}
