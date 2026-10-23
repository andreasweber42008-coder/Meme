import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSammlung } from "@/daten/DatenProvider";
import { useEinstellungen, useGamification, useTage } from "@/daten/hooks";
import { GRUPPEN, type AufgabenGruppe, type SimulationsErgebnis, type Versuch } from "@/daten/modelle";
import { useFortschritt } from "@/lernpfad/fortschritt";
import { EINHEITEN } from "@/lernpfad/einheiten";
import { methodeById } from "@/content";
import { STUFEN } from "@/content/stufen";
import { UNTERTESTS } from "@/content/untertests";
import { gruppenStand, wochenTrend } from "@/statistik/kennzahlen";
import { AmpelPunkt, AMPEL_TEXT } from "@/components/statistik/Bereitschaft";
import { ABZEICHEN } from "@/lib/gamification";
import { formatTag, heute } from "@/lib/datum";
import { cn } from "@/lib/utils";

const kurz = (g: AufgabenGruppe) => UNTERTESTS.find((u) => u.id === g)!.kurzname;
const FARBEN = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

export default function Statistik() {
  const versuche = useSammlung<Versuch>("versuche");
  const sims = useSammlung<SimulationsErgebnis>("simulationen");
  const fortschritt = useFortschritt();
  const [e] = useEinstellungen();
  const g = useGamification();
  const tage = useTage();
  const tag = heute();
  const stand = useMemo(() => gruppenStand(versuche, fortschritt, e, tag), [versuche, fortschritt, e, tag]);
  const trend = useMemo(() => wochenTrend(versuche, tag), [versuche, tag]);
  const [trendGruppen, setTrendGruppen] = useState<AufgabenGruppe[]>(["quanti", "med-nat"]);
  const minutenGesamt = Object.values(tage).reduce((s, t) => s + (t?.minuten ?? 0), 0);

  const radar = stand.map((s) => ({ gruppe: kurz(s.gruppe), genauigkeit: s.genauigkeit !== null ? Math.round(s.genauigkeit * 100) : 0, ziel: Math.round((e.ziele[s.gruppe]?.genauigkeit ?? 0.75) * 100) }));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Statistik</h1>
        <p className="text-sm text-muted-foreground">Deine Entwicklung gemessen an deinen eigenen Zielen. Keine Prognose über die Zulassung.</p>
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border-2 p-2.5">
          <p className="text-xl font-extrabold tabular-nums">{versuche.filter((v) => v.quelle !== "drill").length}</p>
          <p className="text-[11px] text-muted-foreground">Aufgaben</p>
        </div>
        <div className="rounded-2xl border-2 p-2.5">
          <p className="text-xl font-extrabold tabular-nums">{Math.round(minutenGesamt / 60)} h</p>
          <p className="text-[11px] text-muted-foreground">Lernzeit</p>
        </div>
        <div className="rounded-2xl border-2 p-2.5">
          <p className="text-xl font-extrabold tabular-nums text-gold">{g.xpGesamt}</p>
          <p className="text-[11px] text-muted-foreground">XP gesamt</p>
        </div>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="gruppen-titel">
        <h2 id="gruppen-titel" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Pro Aufgabengruppe (letzte 3 Wochen)
        </h2>
        <div className="overflow-x-auto rounded-2xl border-2">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="p-2">Gruppe</th>
                <th className="p-2 text-right">Richtig</th>
                <th className="p-2 text-right">Tempo</th>
                <th className="p-2 text-right">Stufe</th>
              </tr>
            </thead>
            <tbody>
              {stand.map((s) => (
                <tr key={s.gruppe} className="border-t">
                  <td className="p-2">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <AmpelPunkt ampel={s.ampel} /> {kurz(s.gruppe)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{AMPEL_TEXT[s.ampel]}</span>
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {s.genauigkeit !== null ? `${Math.round(s.genauigkeit * 100)} %` : "–"}
                    <span className="block text-[11px] text-muted-foreground">Ziel {Math.round((e.ziele[s.gruppe]?.genauigkeit ?? 0.75) * 100)} %</span>
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {s.tempo !== null ? `${Math.round(s.tempo * 100)} %` : "–"}
                    <span className="block text-[11px] text-muted-foreground">der EMS-Zeit</span>
                  </td>
                  <td className="p-2 text-right tabular-nums">{s.stufe}/8</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border-2 p-3" aria-labelledby="radar-titel">
        <h2 id="radar-titel" className="font-extrabold">
          Profil: richtig vs. Ziel
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radar} outerRadius="72%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="gruppe" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Richtig %" dataKey="genauigkeit" stroke={FARBEN[0]} fill={FARBEN[0]} fillOpacity={0.25} strokeWidth={2} />
            <Radar name="Ziel %" dataKey="ziel" stroke={FARBEN[1]} fill="none" strokeDasharray="4 3" strokeWidth={2} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border-2 p-3" aria-labelledby="trend-titel">
        <h2 id="trend-titel" className="font-extrabold">
          Trend pro Woche (% richtig)
        </h2>
        <div className="flex flex-wrap gap-1">
          {GRUPPEN.map((gr) => {
            const an = trendGruppen.includes(gr);
            return (
              <button
                key={gr}
                type="button"
                aria-pressed={an}
                onClick={() => setTrendGruppen((t) => (an ? t.filter((x) => x !== gr) : t.length >= 4 ? t : [...t, gr]))}
                className={cn("rounded-full border-2 px-2 py-0.5 text-xs font-semibold", an && "border-primary bg-primary/10 text-primary")}
              >
                {kurz(gr)}
              </button>
            );
          })}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="woche" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip formatter={(v: number) => `${v} %`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {trendGruppen.map((gr, k) => (
              <Line key={gr} dataKey={gr} name={kurz(gr)} stroke={FARBEN[k]} strokeWidth={2} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="methoden-titel">
        <h2 id="methoden-titel" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Methoden: Stufe und häufigster Schritt-Fehler
        </h2>
        <ul className="flex flex-col gap-1.5">
          {EINHEITEN.map((ei) => {
            const fp = fortschritt[ei.methodeId];
            const schritte = Object.entries(fp?.schritte ?? {}).sort((a, b) => b[1].fehler - a[1].fehler);
            const top = schritte[0];
            const s = top ? methodeById(ei.methodeId)?.schritte.find((x) => String(x.nr) === top[0]) : undefined;
            const stufe = fp?.beherrschtAm ? 8 : (fp?.stufe ?? 1);
            return (
              <li key={ei.methodeId} className="rounded-xl border-2 p-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{ei.methode.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Stufe {stufe} «{STUFEN[stufe - 1].name}»{fp?.beherrschtAm ? " · gemeistert" : ""}
                  </span>
                </div>
                <div className="mt-1 flex gap-0.5">
                  {STUFEN.map((x) => (
                    <span key={x.nr} className={cn("h-1.5 flex-1 rounded-full", x.nr < stufe || fp?.beherrschtAm ? "bg-primary" : x.nr === stufe ? "bg-gold" : "bg-muted")} />
                  ))}
                </div>
                {s && top[1].fehler > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Häufigster Fehler: Schritt {s.nr} «{s.titel}» ({top[1].fehler}×)
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {sims.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="sim-titel">
          <h2 id="sim-titel" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
            Simulationen
          </h2>
          <ul className="flex flex-col gap-1.5">
            {[...sims]
              .filter((s) => s.abgeschlossen)
              .sort((a, b) => b.start - a.start)
              .map((s) => {
                const werte = Object.values(s.gruppen).filter(Boolean) as Array<{ richtig: number; gesamt: number }>;
                const r = werte.reduce((x, w) => x + w.richtig, 0);
                const n = werte.reduce((x, w) => x + w.gesamt, 0);
                return (
                  <li key={s.id} className="flex justify-between rounded-xl border-2 p-2.5 text-sm">
                    <span>
                      {formatTag(s.tag, "mittel")} · {s.art === "voll" ? "Volle Simulation" : s.art === "generalprobe" ? "Generalprobe" : s.art === "teil-a" ? "Teil A" : "Teil B"}
                    </span>
                    <span className="font-bold tabular-nums">{n ? `${Math.round((r / n) * 100)} %` : "–"}</span>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2" aria-labelledby="abz-titel">
        <h2 id="abz-titel" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Abzeichen
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...ABZEICHEN, ...g.abzeichen.filter((a) => a.id.startsWith("methode:")).map((a) => ({ id: a.id, titel: a.titel, beschreibung: "Stufe 8 bestanden." }))].map((a) => {
            const hat = g.abzeichen.find((x) => x.id === a.id);
            return (
              <li key={a.id} className={cn("rounded-xl border-2 p-2.5 text-sm", hat ? "border-gold bg-gold/10" : "opacity-50")}>
                <p className="font-bold">{a.titel}</p>
                <p className="text-xs text-muted-foreground">{hat ? `seit ${formatTag(hat.am, "kurz")}` : a.beschreibung}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
