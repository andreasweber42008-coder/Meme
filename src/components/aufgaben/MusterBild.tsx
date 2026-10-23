import { useId } from "react";
import type { Ausschnitt, Primitiv } from "@/aufgaben/muster";
import { cn } from "@/lib/utils";

function Formen({ primitive }: { primitive: Primitiv[] }) {
  return (
    <>
      {primitive.map((p, i) =>
        p.t === "linie" ? (
          <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="currentColor" strokeWidth={p.dick ? 1.6 : 0.8} strokeLinecap="round" />
        ) : (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.voll ? "currentColor" : "none"} stroke="currentColor" strokeWidth={0.8} />
        ),
      )}
    </>
  );
}

/** Das ganze Muster (100 × 100) */
export function MusterGanz({ primitive, groesse, className, raster }: { primitive: Primitiv[]; groesse: number; className?: string; raster?: boolean }) {
  return (
    <svg viewBox={`0 0 ${groesse} ${groesse}`} className={cn("rounded-lg border-2 bg-white text-black", className)} role="img" aria-label="Muster">
      <rect x={0} y={0} width={groesse} height={groesse} fill="white" />
      {raster && (
        <g stroke="#3b82f6" strokeOpacity={0.35} strokeWidth={0.3}>
          {[1, 2, 3].map((i) => (
            <g key={i}>
              <line x1={(groesse / 4) * i} y1={0} x2={(groesse / 4) * i} y2={groesse} />
              <line x1={0} y1={(groesse / 4) * i} x2={groesse} y2={(groesse / 4) * i} />
            </g>
          ))}
        </g>
      )}
      <Formen primitive={primitive} />
    </svg>
  );
}

/** Ein Ausschnitt (Koordinaten relativ zum Fenster), Kreise per clipPath abgeschnitten */
export function MusterAusschnitt({ ausschnitt, className, kreuz }: { ausschnitt: Ausschnitt; className?: string; kreuz?: boolean }) {
  const id = useId().replace(/:/g, "");
  const g = ausschnitt.fenster.g;
  return (
    <svg viewBox={`0 0 ${g} ${g}`} className={cn("rounded-md border-2 bg-white text-black", className)} role="img" aria-label="Ausschnitt">
      <defs>
        <clipPath id={`c${id}`}>
          <rect x={0} y={0} width={g} height={g} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={g} height={g} fill="white" />
      <g clipPath={`url(#c${id})`}>
        <Formen primitive={ausschnitt.primitive} />
      </g>
      {kreuz && (
        <g stroke="#3b82f6" strokeOpacity={0.5} strokeWidth={0.4} strokeDasharray="1 1">
          <line x1={g / 2} y1={0} x2={g / 2} y2={g} />
          <line x1={0} y1={g / 2} x2={g} y2={g / 2} />
        </g>
      )}
    </svg>
  );
}
