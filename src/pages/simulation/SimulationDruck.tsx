import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ClipboardPen, Loader2, Printer } from "lucide-react";
import { useEinstellungen } from "@/daten/hooks";
import type { AufgabenGruppe } from "@/daten/modelle";
import { BUCHSTABEN, type Aufgabe } from "@/aufgaben/typen";
import type { MusterDaten } from "@/aufgaben/muster";
import type { ObjekteDaten } from "@/aufgaben/objekte";
import { EINHEIT, type Matrix, type Objekt } from "@/aufgaben/objekte";
import { fallText } from "@/aufgaben/fakten";
import { konzRegel } from "@/aufgaben/konz";
import { GRUPPEN_INFO, gesamtMinuten, seedBereinigen, type AblaufBlock, type SimInhalt } from "@/simulation/ablauf";
import { ablaufAusParametern, minutenText, useSimInhalt } from "@/simulation/lauf";
import { Stimulus, LeseText } from "@/components/aufgaben/AufgabeAnsicht";
import { MusterAusschnitt, MusterGanz } from "@/components/aufgaben/MusterBild";
import { ObjekteSzene } from "@/components/aufgaben/ObjekteSzene";
import { FigurBild } from "@/components/aufgaben/FigurBild";
import { KonzDruckblatt } from "@/components/aufgaben/KonzBlattAnsicht";
import { AntwortbogenDruck } from "@/components/simulation/AntwortbogenSim";
import { Button } from "@/components/ui/button";
import { neuerSeed } from "@/lib/zufall";

/** Helle Farb-Tokens für das «Papier» – auch wenn die App im dunklen Modus läuft. */
const PAPIER = {
  "--background": "0 0% 100%",
  "--foreground": "0 0% 0%",
  "--card": "0 0% 100%",
  "--card-foreground": "0 0% 0%",
  "--muted": "0 0% 94%",
  "--muted-foreground": "0 0% 25%",
  "--border": "0 0% 60%",
  "--primary": "0 0% 0%",
  "--primary-foreground": "0 0% 100%",
  backgroundColor: "white",
  color: "black",
} as CSSProperties;

/** Beim Drucken: Kopfzeile und Navigation der App ausblenden, volle Breite. */
const DRUCK_CSS = `
@media print {
  #root > div > header, #root > div > nav { display: none !important; }
  #root > div { padding-bottom: 0 !important; }
  #root > div > main { max-width: none !important; padding: 0 !important; }
  .papier figcaption button { display: none !important; }
  .papier-blatt { box-shadow: none !important; border: 0 !important; margin: 0 !important; }
}`;

/* ------------------------------------------------------------------ 3D → PNG */

interface SzenenAuftrag {
  key: string;
  objekte: Objekt[];
  drehung: Matrix;
}

/** Rendert eine Szene ausserhalb des sichtbaren Bereichs und liefert ein PNG (WebGL nur einmal gleichzeitig). */
function SzeneZuBild({ auftrag, onBild }: { auftrag: SzenenAuftrag; onBild: (key: string, url: string) => void }) {
  const fertig = useRef(false);
  const melden = useCallback(
    (url: string) => {
      if (fertig.current) return;
      fertig.current = true;
      onBild(auftrag.key, url);
    },
    [auftrag.key, onBild],
  );
  useEffect(() => {
    const notfall = setTimeout(() => melden(""), 4000); // ohne WebGL: Platzhalter
    return () => clearTimeout(notfall);
  }, [melden]);
  return (
    <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, width: 360, height: 360, pointerEvents: "none" }}>
      <ObjekteSzene
        objekte={auftrag.objekte}
        drehung={auftrag.drehung}
        fuerDruck
        onCanvas={(c) => {
          // ein paar Frames abwarten, bis die Szene gezeichnet ist
          setTimeout(() => {
            try {
              melden(c.toDataURL("image/png"));
            } catch {
              melden("");
            }
          }, 300);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Bausteine */

function Blatt({ children, umbruch = true }: { children: ReactNode; umbruch?: boolean }) {
  return <section className={`papier-blatt ${umbruch ? "seitenumbruch" : ""} mb-6 rounded-sm border bg-white p-4 text-black shadow-sm`}>{children}</section>;
}

function BlattKopf({ block, von, bis }: { block: AblaufBlock; von?: number; bis?: number }) {
  const g = block.gruppe ? GRUPPEN_INFO[block.gruppe] : null;
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black pb-1.5">
      <h2 className="text-base font-bold">
        Testheft {block.teil} · {g?.name}
        {block.phase === "einpraegen" ? " – Einprägen" : block.phase === "abruf" ? " – Abruf" : ""}
      </h2>
      <span className="text-xs">
        {block.minuten} Minuten{von !== undefined && bis !== undefined ? ` · Aufgaben ${von}–${bis}` : ""}
      </span>
    </div>
  );
}

function DruckOptionen({ a }: { a: Aufgabe }) {
  if (a.generator === "muster") {
    const d = a.daten as MusterDaten;
    return (
      <div className="grid grid-cols-5 gap-2">
        {d.ausschnitte.map((x, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold">{BUCHSTABEN[i]}</span>
            <MusterAusschnitt ausschnitt={x} className="w-full" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-0.5 text-[14px]">
      {a.optionen.map((o, i) => (
        <li key={i} className="flex gap-2">
          <b className="w-4 shrink-0">{BUCHSTABEN[i]}</b>
          <span>{o.text}</span>
        </li>
      ))}
    </ol>
  );
}

function DruckStimulus({ a, bilder }: { a: Aufgabe; bilder: Record<string, string> }) {
  if (a.generator === "muster") {
    const d = a.daten as MusterDaten;
    return <MusterGanz primitive={d.primitive} groesse={d.groesse} className="mx-auto w-full max-w-[260px]" />;
  }
  if (a.generator === "objekte") {
    const bild = (k: string, label: string) => (
      <figure className="flex flex-col items-center gap-0.5">
        {bilder[k] ? <img src={bilder[k]} alt={label} className="aspect-square w-full max-w-[220px] border border-black/40" /> : <div className="flex aspect-square w-full max-w-[220px] items-center justify-center border border-dashed text-xs">3D-Bild fehlt</div>}
        <figcaption className="text-xs font-bold">{label}</figcaption>
      </figure>
    );
    return (
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-3">
          {bild(`${a.seed}-v`, "Vorher")}
          {bild(`${a.seed}-n`, "Nachher")}
        </div>
        <p className="text-[11px]">→ drehen nach rechts · ← nach links · ↑ kippen nach hinten · ↓ kippen nach vorne (Blick von vorne)</p>
      </div>
    );
  }
  return <Stimulus aufgabe={a} />;
}

function BlockSeiten({ block, inhalt, bilder }: { block: AblaufBlock; inhalt: SimInhalt; bilder: Record<string, string> }) {
  const g = block.gruppe as AufgabenGruppe;
  if (block.phase === "einpraegen") {
    if (g === "figuren-lernen" && inhalt.figuren)
      return (
        <Blatt>
          <BlattKopf block={block} />
          <p className="mb-2 text-xs">Präge dir ein, welche Fläche jeder Figur schwarz ist. Keine Notizen.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {inhalt.figuren.figuren.map((f, k) => (
              <FigurBild key={k} figur={f} modus="lernen" className="w-full !border !bg-white" />
            ))}
          </div>
        </Blatt>
      );
    if (g === "fakten-lernen" && inhalt.fakten)
      return (
        <Blatt>
          <BlattKopf block={block} />
          <p className="mb-2 text-xs">Präge dir die 15 Fälle ein. Keine Notizen.</p>
          <div className="flex flex-col gap-3">
            {Array.from({ length: Math.max(...inhalt.fakten.faelle.map((f) => f.gruppe)) + 1 }, (_, k) => (
              <div key={k} className="break-inside-avoid">
                <p className="text-xs font-bold">Gruppe {k + 1}</p>
                {inhalt.fakten!.faelle
                  .filter((f) => f.gruppe === k)
                  .map((f) => (
                    <p key={f.id} className="text-[14px]">
                      {fallText(f)}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        </Blatt>
      );
    return null;
  }
  if (block.phase === "abruf") {
    if (g === "figuren-lernen" && inhalt.figuren)
      return (
        <Blatt>
          <BlattKopf block={block} von={1} bis={inhalt.figuren.abfrage.length} />
          <p className="mb-2 text-xs">Welche Fläche (A–E) war schwarz? Markiere auf dem Antwortbogen.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {inhalt.figuren.abfrage.map((idx, i) => (
              <div key={i} className="flex break-inside-avoid flex-col gap-0.5">
                <span className="text-xs font-bold">{i + 1}.</span>
                <FigurBild figur={inhalt.figuren!.figuren[idx]} modus="abruf" className="w-full !border !bg-white" />
              </div>
            ))}
          </div>
        </Blatt>
      );
    if (g === "fakten-lernen" && inhalt.fakten)
      return (
        <Blatt>
          <BlattKopf block={block} von={1} bis={inhalt.fakten.fragen.length} />
          <div className="flex flex-col gap-3">
            {inhalt.fakten.fragen.map((q, i) => (
              <div key={i} className="break-inside-avoid text-[14px]">
                <p className="font-bold">
                  {i + 1}. {q.frage}
                </p>
                <ol>
                  {q.optionen.map((o, k) => (
                    <li key={k}>
                      <b className="mr-2">{BUCHSTABEN[k]}</b>
                      {o}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Blatt>
      );
    return null;
  }
  if (g === "konz" && inhalt.konz) {
    const regel = konzRegel(inhalt.konz.regelId);
    return <KonzDruckblatt blatt={inhalt.konz} anweisung={regel.anweisung} titel={`Testheft B · Konzentriertes und sorgfältiges Arbeiten – ${regel.titel}`} />;
  }
  const liste = inhalt.aufgaben[g] ?? [];
  if (g === "textverstaendnis") {
    return (
      <>
        {inhalt.texte.map((t, k) => (
          <Blatt key={t.id}>
            {k === 0 && <BlattKopf block={block} von={1} bis={liste.length} />}
            <LeseText titel={`Text ${k + 1}: ${t.titel}`} absaetze={t.absaetze} />
            <div className="mt-3 flex flex-col gap-3">
              {liste.map((s, i) =>
                s.text === k ? (
                  <div key={i} className="break-inside-avoid">
                    <Stimulus aufgabe={s.aufgabe} />
                    <p className="my-1 font-bold">
                      {i + 1}. {s.aufgabe.frage}
                    </p>
                    <DruckOptionen a={s.aufgabe} />
                  </div>
                ) : null,
              )}
            </div>
          </Blatt>
        ))}
      </>
    );
  }
  return (
    <Blatt>
      <BlattKopf block={block} von={1} bis={liste.length} />
      <div className="flex flex-col gap-5">
        {liste.map((s, i) => (
          <div key={i} className="flex break-inside-avoid flex-col gap-2 border-b border-dashed border-black/30 pb-4 last:border-0">
            <DruckStimulus a={s.aufgabe} bilder={bilder} />
            <p className="font-bold">
              {i + 1}. {s.aufgabe.frage}
            </p>
            <DruckOptionen a={s.aufgabe} />
          </div>
        ))}
      </div>
    </Blatt>
  );
}

/* ------------------------------------------------------------------ Seite */

export default function SimulationDruck() {
  const [params, setParams] = useSearchParams();
  const [e] = useEinstellungen();
  const seed = seedBereinigen(params.get("seed") || "");
  useEffect(() => {
    if (!params.get("seed")) {
      const p = new URLSearchParams(params);
      p.set("seed", neuerSeed());
      setParams(p, { replace: true });
    }
  }, [params, setParams]);

  const { art, mini, ablauf } = useMemo(() => ablaufAusParametern(params, e.heftwechselMinuten, e.testbeginn), [params, e.heftwechselMinuten, e.testbeginn]);
  const inhalt = useSimInhalt(params.get("seed") ? seed : undefined, ablauf);

  const auftraege: SzenenAuftrag[] = useMemo(
    () =>
      (inhalt?.aufgaben["objekte-im-raum"] ?? []).flatMap((s) => {
        const d = s.aufgabe.daten as ObjekteDaten;
        return [
          { key: `${s.aufgabe.seed}-v`, objekte: d.objekte, drehung: EINHEIT },
          { key: `${s.aufgabe.seed}-n`, objekte: d.objekte, drehung: d.ziel },
        ];
      }),
    [inhalt],
  );
  const [bilder, setBilder] = useState<Record<string, string>>({});
  const onBild = useCallback((key: string, url: string) => setBilder((b) => ({ ...b, [key]: url })), []);
  const offen = auftraege.find((a) => bilder[a.key] === undefined);
  const fertig = !!inhalt && !offen;

  const antwortGruppen = useMemo(() => {
    const out: Array<{ gruppe: AufgabenGruppe; titel: string; anzahl: number; teil: string }> = [];
    for (const b of ablauf) {
      if (!b.gruppe || b.gruppe === "konz" || b.phase === "einpraegen" || b.phase === "heftwechsel") continue;
      out.push({ gruppe: b.gruppe, titel: GRUPPEN_INFO[b.gruppe].kurz, anzahl: b.gruppe === "textverstaendnis" ? (inhalt?.aufgaben.textverstaendnis?.length ?? b.anzahl) : b.anzahl, teil: b.teil });
    }
    return out;
  }, [ablauf, inhalt]);

  const papierLink = `/simulation/papier/${seed}?art=${art}${mini ? `&gruppen=${mini.join(",")}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <style>{DRUCK_CSS}</style>
      <div className="nicht-drucken flex flex-col gap-3">
        <Link to="/simulation" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Simulation
        </Link>
        <h1 className="text-2xl font-extrabold">Simulation auf Papier</h1>
        <p className="text-sm text-muted-foreground">
          Testheft, separater Antwortbogen und Konz-Blatt mit Auswerte-Schablone. Drucke auf A4, schwarz-weiss. Danach trägst du deine Antworten hier ein und bekommst die normale Auswertung.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={() => window.print()} disabled={!fertig} className="sm:flex-1">
            {fertig ? (
              <>
                <Printer /> Drucken
              </>
            ) : (
              <>
                <Loader2 className="animate-spin" />
                {inhalt ? `3D-Bilder ${Object.keys(bilder).length}/${auftraege.length}` : "Testheft wird erstellt …"}
              </>
            )}
          </Button>
          <Link to={papierLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 bg-background px-5 font-semibold hover:bg-muted sm:flex-1">
            <ClipboardPen className="h-4 w-4" /> Resultate eintragen
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Merk dir den Code <b className="font-mono">{seed}</b> – damit findest du die Auswertung wieder. Die Auswerte-Schablone liegt am Schluss: erst nach dem Konz ansehen.
        </p>
      </div>

      {offen && <SzeneZuBild key={offen.key} auftrag={offen} onBild={onBild} />}

      {inhalt && (
        <div className="papier flex flex-col" style={PAPIER}>
          <Blatt>
            <h2 className="mb-1 text-xl font-bold">EMS-Simulation (Übung)</h2>
            <p className="mb-3 text-xs">
              Eigene Übungsaufgaben, keine echten EMS-Aufgaben · Code {seed} · {minutenText(gesamtMinuten(ablauf))}
            </p>
            <table className="mb-4 w-full border-collapse text-sm">
              <tbody>
                {ablauf.map((b) => (
                  <tr key={b.id} className="border-b border-black/20">
                    <td className="py-1 pr-2 font-mono text-xs">
                      {b.start}–{b.ende}
                    </td>
                    <td className="py-1">
                      {b.phase === "heftwechsel" ? "Heftwechsel" : `${GRUPPEN_INFO[b.gruppe!].name}${b.phase === "einpraegen" ? " – Einprägen" : b.phase === "abruf" ? " – Abruf" : ""}`}
                    </td>
                    <td className="py-1 text-right text-xs">{b.minuten} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="list-disc pl-5 text-[13px]">
              <li>Uhrzeiten ab Testbeginn {e.testbeginn}. Lass dir die Zeit ansagen oder stelle einen Wecker ausser Sicht – keine Uhr am Platz.</li>
              <li>Blättern nur innerhalb der aktuellen Gruppe, nie vor oder zurück in andere Gruppen.</li>
              <li>Sofort auf dem separaten Antwortbogen markieren. Kein Abzug für falsche Antworten → immer ankreuzen.</li>
              <li>Notizen im Testheft erlaubt, ausser in den Gedächtnistests.</li>
              <li>Konz: Filzstift, Zeile für Zeile; gewertet wird bis zur letzten Markierung.</li>
            </ul>
          </Blatt>

          {ablauf.map((b) =>
            b.phase === "heftwechsel" ? (
              <Blatt key={b.id}>
                <p className="py-10 text-center text-lg font-bold">Ende Testheft A · Heftwechsel ({b.minuten} Minuten)</p>
              </Blatt>
            ) : (
              <BlockSeiten key={b.id} block={b} inhalt={inhalt} bilder={bilder} />
            ),
          )}

          {antwortGruppen.length > 0 && <AntwortbogenDruck gruppen={antwortGruppen} titel={`Antwortbogen · Code ${seed}`} />}

          {inhalt.konz && (
            <KonzDruckblatt blatt={inhalt.konz} anweisung="Lege die Schablone neben dein Blatt. Zähle bis zu deiner letzten Markierung: richtig markiert, falsch markiert, übersehen. Trage die Zahlen unter «Resultate eintragen» ein." titel={`Konz · Auswerte-Schablone · Code ${seed}`} schablone />
          )}
        </div>
      )}
    </div>
  );
}
