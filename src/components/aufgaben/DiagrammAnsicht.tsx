import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DiagrammDaten } from "@/aufgaben/diagramme";
import { zahl } from "@/aufgaben/quanti";

/** Kategoriale Farben in fester Reihenfolge (validierte Standardpalette, helle Stufe – das Diagramm steht auf «Papier»). */
const FARBEN = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
const TEXT = "#3b3b38";
const RASTER = "#e4e3dd";

function Tabelle({ d }: { d: DiagrammDaten }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b-2 border-black/70 p-1.5 text-left">{d.xTitel}</th>
            {d.reihen.map((r) => (
              <th key={r.name} className="border-b-2 border-black/70 p-1.5 text-right">
                {r.name}
                {r.achse === "rechts" && d.y2Einheit ? ` (${d.y2Einheit})` : d.einheit ? ` (${d.einheit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.kategorien.map((k, i) => (
            <tr key={k} className="border-b border-black/15">
              <td className="p-1.5">{k}</td>
              {d.reihen.map((r) => (
                <td key={r.name} className="p-1.5 text-right tabular-nums">
                  {zahl(r.werte[i])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function zeilen(d: DiagrammDaten) {
  return d.kategorien.map((k, i) => Object.fromEntries([["k", k], ...d.reihen.map((r) => [r.name, r.werte[i]])]));
}

const achse = { stroke: TEXT, fontSize: 11, tick: { fill: TEXT } };
const tip = (einheit: string) => (v: number) => `${zahl(v)}${einheit ? ` ${einheit}` : ""}`;

/**
 * Diagramm im Stil der Testhefte. Die Darstellungsarten (auch zwei y-Achsen und log-Achsen)
 * sind Teil des EMS-Untertests – genau ihr Lesen wird trainiert.
 */
export function DiagrammAnsicht({ daten: d }: { daten: DiagrammDaten }) {
  const [alsTabelle, setAlsTabelle] = useState(false);
  const daten = zeilen(d);
  const hoehe = 260;
  let diagramm: React.ReactNode;

  if (d.art === "tabelle" || alsTabelle) diagramm = <Tabelle d={d} />;
  else if (d.art === "saeulen" || d.art === "anteile") {
    diagramm = (
      <ResponsiveContainer width="100%" height={hoehe}>
        <BarChart data={daten} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barGap={2}>
          <CartesianGrid stroke={RASTER} vertical={false} />
          <XAxis dataKey="k" {...achse} />
          <YAxis {...achse} width={48} domain={d.art === "anteile" ? [0, 100] : undefined} label={{ value: d.yTitel, angle: -90, position: "insideLeft", fill: TEXT, fontSize: 11 }} />
          <Tooltip formatter={tip(d.einheit)} />
          {d.reihen.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: TEXT }} />}
          {d.reihen.map((r, i) => (
            <Bar key={r.name} dataKey={r.name} fill={FARBEN[i]} radius={d.art === "anteile" ? 0 : [4, 4, 0, 0]} stackId={d.art === "anteile" ? "s" : undefined} stroke="#fff" strokeWidth={d.art === "anteile" ? 2 : 0} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  } else if (d.art === "zwei-achsen") {
    diagramm = (
      <ResponsiveContainer width="100%" height={hoehe}>
        <ComposedChart data={daten} margin={{ top: 8, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={RASTER} vertical={false} />
          <XAxis dataKey="k" {...achse} />
          <YAxis yAxisId="l" {...achse} width={48} label={{ value: d.yTitel, angle: -90, position: "insideLeft", fill: TEXT, fontSize: 11 }} />
          <YAxis yAxisId="r" orientation="right" {...achse} width={48} label={{ value: d.y2Titel, angle: 90, position: "insideRight", fill: TEXT, fontSize: 11 }} />
          <Tooltip formatter={(v: number, name: string) => tip(d.reihen.find((r) => r.name === name)?.achse === "rechts" ? (d.y2Einheit ?? "") : d.einheit)(v)} />
          <Legend wrapperStyle={{ fontSize: 12, color: TEXT }} />
          {d.reihen.map((r, i) =>
            r.achse === "rechts" ? (
              <Line key={r.name} yAxisId="r" dataKey={r.name} stroke={FARBEN[i]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
            ) : (
              <Bar key={r.name} yAxisId="l" dataKey={r.name} fill={FARBEN[i]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  } else {
    diagramm = (
      <ResponsiveContainer width="100%" height={hoehe}>
        <LineChart data={daten} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={RASTER} />
          <XAxis dataKey="k" {...achse} label={{ value: d.xTitel, position: "insideBottom", offset: -2, fill: TEXT, fontSize: 11 }} height={36} />
          <YAxis
            {...achse}
            width={52}
            scale={d.art === "log" ? "log" : "auto"}
            domain={d.art === "log" ? ["auto", "auto"] : undefined}
            allowDataOverflow={d.art === "log"}
            tickFormatter={(v: number) => zahl(v, 0)}
            label={{ value: d.yTitel, angle: -90, position: "insideLeft", fill: TEXT, fontSize: 11 }}
          />
          <Tooltip formatter={tip(d.einheit)} />
          {d.reihen.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: TEXT }} />}
          {d.reihen.map((r, i) => (
            <Line key={r.name} dataKey={r.name} stroke={FARBEN[i]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <figure className="flex flex-col gap-2 rounded-xl border-2 bg-white p-3 text-black">
      <figcaption className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold leading-tight">{d.titel}</p>
          <p className="text-sm text-black/70">{d.beschreibung}</p>
        </div>
        {d.art !== "tabelle" && (
          <button type="button" onClick={() => setAlsTabelle((t) => !t)} className="shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold text-black/70">
            {alsTabelle ? "Diagramm" : "Tabelle"}
          </button>
        )}
      </figcaption>
      {diagramm}
    </figure>
  );
}
