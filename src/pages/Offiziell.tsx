import { ExternalLink } from "lucide-react";
import { useDokument, useSpeicher } from "@/daten/DatenProvider";
import { useEinstellungen } from "@/daten/hooks";
import { testdatum } from "@/plan/plan";
import { formatTag, heute, tageZwischen, testanmeldungBis, voranmeldungBis } from "@/lib/datum";
import { cn } from "@/lib/utils";

const LINKS = [
  { titel: "Test-Info 2026 (swissuniversities)", url: "https://www.swissuniversities.ch/fileadmin/swissuniversities/Dokumente/Lehre/Medizin/Testinfo2026_de.pdf", text: "Ablauf, Regeln, Zeiten, Wertung – unbedingt ganz lesen." },
  { titel: "Offizielle Beispielaufgaben 2026", url: "https://www.swissuniversities.ch/fileadmin/swissuniversities/Dokumente/Lehre/Medizin/Beispielaufgaben2026.pdf", text: "Das offizielle Format. In der Material-Bibliothek privat importierbar." },
  { titel: "Konz-Beispiele mit Umrechnungstabellen", url: "https://www.swissuniversities.ch/fileadmin/swissuniversities/Dokumente/Lehre/Medizin/BeispielaufgabenKonz.pdf", text: "Sechs Beispielblätter K1–K6." },
  { titel: "NCWiki", url: "https://www.nc-wiki.ch", text: "Übungsserien, Simulationen, Tipps (CC BY-NC 4.0)." },
];

const CHECKLISTE = [
  { id: "testinfo", text: "Test-Info gelesen" },
  { id: "beispiele", text: "Offizielle Beispielaufgaben bearbeitet" },
  { id: "konz", text: "Konz-Beispiele K1–K6 bearbeitet" },
  { id: "voranmeldung", text: "Voranmeldung bei swissuniversities erledigt" },
  { id: "anmeldung", text: "Testanmeldung abgeschickt und 300 CHF bezahlt" },
  { id: "testort", text: "Testort gewählt" },
  { id: "einladung", text: "Einladung erhalten und Testbeginn eingetragen" },
  { id: "anreise", text: "Anreise geplant (Generalprobe)" },
];

export default function Offiziell() {
  const store = useSpeicher();
  const [e] = useEinstellungen();
  const liste = useDokument<{ erledigt: string[] }>("checklisten", "offiziell");
  const erledigt = new Set(liste?.erledigt ?? []);
  const t = testdatum(e);
  const jahr = Number(t.slice(0, 4));
  const tag = heute();
  const fristen = [
    { titel: "Voranmeldung swissuniversities", datum: voranmeldungBis(jahr) },
    { titel: "Testanmeldung inkl. 300 CHF", datum: testanmeldungBis(jahr) },
    { titel: "EMS", datum: t },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-extrabold">Offizielles</h1>
        <p className="text-sm text-muted-foreground">Fristen, Regeln und Unterlagen. Massgebend ist immer swissuniversities.</p>
      </header>

      <section className="flex flex-col gap-2" aria-labelledby="fristen">
        <h2 id="fristen" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Fristen {jahr}
        </h2>
        <ul className="flex flex-col gap-1.5">
          {fristen.map((f) => {
            const d = tageZwischen(tag, f.datum);
            return (
              <li key={f.titel} className={cn("flex items-center justify-between rounded-xl border-2 p-3", d >= 0 && d <= 14 && "border-flamme bg-flamme/5")}>
                <span className="font-semibold">{f.titel}</span>
                <span className="text-right text-sm">
                  {formatTag(f.datum, "mittel")}
                  <span className="block text-xs text-muted-foreground">{d > 0 ? `in ${d} Tagen` : d === 0 ? "heute" : "vorbei"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="check">
        <h2 id="check" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Checkliste
        </h2>
        <ul className="flex flex-col gap-1.5">
          {CHECKLISTE.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 bg-card p-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={erledigt.has(c.id)}
                  onChange={(ev) => {
                    const n = new Set(erledigt);
                    if (ev.target.checked) n.add(c.id);
                    else n.delete(c.id);
                    void store.speichern("checklisten", "offiziell", { erledigt: [...n] });
                  }}
                />
                <span className={cn(erledigt.has(c.id) && "line-through opacity-60")}>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="links">
        <h2 id="links" className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
          Unterlagen
        </h2>
        <ul className="flex flex-col gap-1.5">
          {LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer noopener" className="flex items-start gap-2 rounded-xl border-2 p-3 hover:border-primary/50">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold">{l.titel}</span>
                  <span className="block text-xs text-muted-foreground">{l.text}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1.5 rounded-2xl border-2 p-4 text-sm" aria-labelledby="regeln">
        <h2 id="regeln" className="font-extrabold">
          Die wichtigsten Regeln
        </h2>
        <ul className="list-disc pl-5">
          <li>Keine Uhr am Platz – die Zeit wird zentral angezeigt. Kein Taschenrechner, kein Lineal.</li>
          <li>Sofort auf dem Antwortbogen markieren; nach Ablauf der Zeit kann nichts mehr übertragen werden.</li>
          <li>Notizen im Testheft erlaubt – ausser in den Gedächtnistests.</li>
          <li>Wer zu spät kommt, wird nicht eingelassen. Es gibt keinen Nachholtermin.</li>
          <li>Mitbringen: Einladung, Ausweis mit Foto (kein Swisspass), 3 weiche Bleistifte, Spitzer, Radiergummi, schwarzer oder blauer Filzstift für Konz, Textmarker, Snacks lose oder im durchsichtigen Beutel.</li>
        </ul>
      </section>
    </div>
  );
}
