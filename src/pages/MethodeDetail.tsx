import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Clock, ExternalLink, Lock, Scale } from "lucide-react";
import { toast } from "sonner";
import { entscheidung, methodeById, offeneFrage, videosFuer } from "@/content";
import type { Herkunft, Methode } from "@/content/schema";
import { untertestById } from "@/content/untertests";
import { STUFEN } from "@/content/stufen";
import { useFortschritt, useVerstanden } from "@/lernpfad/fortschritt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArtBadge, EmsBadge, HerkunftBadge } from "@/components/methoden/Badges";
import { ItemListe } from "@/components/methoden/ItemListe";
import { VideoEinbettung } from "@/components/methoden/VideoEinbettung";
import { cn } from "@/lib/utils";
import NichtGefunden from "./NichtGefunden";

function Abschnitt({ titel, children, id }: { titel: string; children: ReactNode; id?: string }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-extrabold">
        {titel}
      </h2>
      {children}
    </section>
  );
}

const LEER = "In den Notizen nicht angegeben.";

export default function MethodeDetail() {
  const { id = "" } = useParams();
  const methode = methodeById(id);
  const fortschritt = useFortschritt();
  const markieren = useVerstanden();

  if (!methode) return <NichtGefunden />;
  const m: Methode = methode;
  const h: Herkunft = m.herkunft;
  const untertest = untertestById(m.untertest);
  const verstanden = !!fortschritt[m.id]?.verstandenAm;
  const videos = m.quellen.filter((q) => q.videoId);
  const eigeneVideoIds = new Set(videos.map((v) => v.videoId));
  const weitereVideos = videosFuer(m.untertest).filter((v) => !eigeneVideoIds.has(v.videoId));
  const uebertragen = m.ems.uebertragenAuf ? methodeById(m.ems.uebertragenAuf) : undefined;

  function umschalten() {
    markieren(m.id, !verstanden).then(
      () => toast.success(verstanden ? "Markierung entfernt." : "Stark! Stufe 1 «Verstehen» erledigt."),
      () => toast.error("Speichern hat nicht geklappt."),
    );
  }

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link to="/methoden" className="flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Bibliothek
        </Link>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{untertest.name}</p>
        <h1 className="text-2xl font-extrabold leading-tight">{m.name}</h1>
        <div className="flex flex-wrap gap-1">
          <HerkunftBadge herkunft={h} />
          <EmsBadge status={m.ems.status} />
          <ArtBadge art={m.art} />
        </div>
        {m.kernaussage && (
          <blockquote className="rounded-2xl border-l-4 border-primary bg-primary/5 p-4 text-[15px] leading-relaxed">
            {m.kernaussage}
          </blockquote>
        )}
        <p className="leading-relaxed">
          <span className="font-bold">Ziel: </span>
          {m.ziel}
        </p>
      </div>

      {videos.length > 0 && (
        <Abschnitt titel="Video">
          <div className="flex flex-col gap-3">
            {videos.map((v) => (
              <VideoEinbettung key={v.videoId} videoId={v.videoId!} titel={v.originaltitel ?? v.titel} />
            ))}
          </div>
        </Abschnitt>
      )}

      <Abschnitt titel="EMS-Abgleich" id="ems">
        <div className="flex flex-col gap-3 rounded-2xl border-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <EmsBadge status={m.ems.status} />
            {m.ems.zeitbudget && (
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Clock className="h-4 w-4" /> {m.ems.zeitbudget}
              </span>
            )}
          </div>
          {m.eckdatenTms && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">TMS-Eckdaten aus den Notizen: </span>
              {m.eckdatenTms}
            </p>
          )}
          <ItemListe items={m.ems.anpassungen} standard={h} />
          {m.ems.nurTms.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Gilt nur im TMS</p>
              <ItemListe items={m.ems.nurTms} standard={h} />
            </div>
          )}
          {uebertragen && (
            <Link to={`/methoden/${uebertragen.id}`} className="text-sm font-semibold text-primary">
              Übertragen auf: {uebertragen.name} →
            </Link>
          )}
        </div>
      </Abschnitt>

      <Abschnitt titel="Schritte" id="schritte">
        {m.schritteHinweis && <p className="text-sm italic text-muted-foreground">{m.schritteHinweis}</p>}
        <ol className="flex flex-col gap-3">
          {m.schritte.map((s) => (
            <li key={s.nr} className="flex gap-3 rounded-2xl border-2 bg-card p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                {s.nr}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold">{s.titel}</span>
                  {s.phase && (
                    <Badge className="border-border text-muted-foreground">{s.phase === "einrichten" ? "einmalig einrichten" : "Nachbereitung"}</Badge>
                  )}
                  {s.herkunft !== h && <HerkunftBadge herkunft={s.herkunft} />}
                </div>
                <p className="text-sm leading-relaxed">{s.tun}</p>
                {s.achten.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Worauf achten</p>
                    <ItemListe items={s.achten} standard={s.herkunft} />
                  </div>
                )}
                {s.zeit && (
                  <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {s.zeit}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Abschnitt>

      <div className="grid gap-8 sm:grid-cols-2">
        <Abschnitt titel="Wann einsetzen">
          <ItemListe items={m.einsetzen} standard={h} leer={LEER} />
        </Abschnitt>
        <Abschnitt titel="Wann nicht">
          <ItemListe items={m.nichtEinsetzen} standard={h} leer={LEER} />
        </Abschnitt>
      </div>

      <Abschnitt titel="Typische Fehler">
        <ItemListe items={m.typischeFehler} standard={h} leer={LEER} />
      </Abschnitt>

      <Abschnitt titel="Übungsempfehlung">
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["Menge", m.uebung.menge],
              ["Reihenfolge", m.uebung.reihenfolge],
              ["Steigerung", m.uebung.steigerung],
            ] as const
          ).map(([titel, items]) => (
            <div key={titel} className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titel}</p>
              <ItemListe items={[...items]} standard={h} leer={LEER} />
            </div>
          ))}
        </div>
      </Abschnitt>

      {m.werkzeuge && m.werkzeuge.length > 0 && (
        <Abschnitt titel="Werkzeuge">
          <ItemListe items={m.werkzeuge} standard={h} />
        </Abschnitt>
      )}

      {m.weitereTipps.length > 0 && (
        <Abschnitt titel="Weitere Tipps aus den Notizen">
          <ItemListe items={m.weitereTipps} standard={h} />
        </Abschnitt>
      )}

      {m.beispiele.length > 0 && (
        <Abschnitt titel="Beispiele">
          <ItemListe items={m.beispiele} standard={h} />
        </Abschnitt>
      )}

      {m.ergaenzungen.length > 0 && (
        <Abschnitt titel="Ergänzungen">
          <ItemListe items={m.ergaenzungen} standard={h} />
        </Abschnitt>
      )}

      {m.varianten.length > 0 && (
        <Abschnitt titel="Zwei Varianten – entschieden">
          <div className="flex flex-col gap-4">
            {m.varianten.map((wid) => {
              const e = entscheidung(wid);
              if (!e) return null;
              return (
                <div key={wid} className="flex flex-col gap-3 rounded-2xl border-2 p-4">
                  <p className="flex items-center gap-2 font-bold">
                    <Scale className="h-4 w-4" /> {e.id}: {e.thema}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(["a", "b"] as const).map((seite) => {
                      const v = e[seite];
                      const gewaehlt = e.gewaehlt === seite || e.gewaehlt === "beide";
                      return (
                        <div
                          key={seite}
                          className={cn("flex flex-col gap-2 rounded-xl border-2 p-3 text-sm", gewaehlt ? "border-primary bg-primary/5" : "opacity-80")}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-extrabold uppercase">Variante {seite}</span>
                            <HerkunftBadge herkunft={v.herkunft} />
                            {gewaehlt && (
                              <Badge className="border-primary bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" /> {e.gewaehlt === "beide" ? "kombiniert" : "gewählt"}
                              </Badge>
                            )}
                          </div>
                          <p className="leading-relaxed">{v.text}</p>
                          <p className="text-xs text-muted-foreground">{v.quelle}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm leading-relaxed">
                    <span className="font-bold">Begründung: </span>
                    {e.begruendung}
                  </p>
                </div>
              );
            })}
          </div>
        </Abschnitt>
      )}

      {m.unklar.length > 0 && (
        <Abschnitt titel="Offene Punkte – entschieden">
          <ul className="flex flex-col gap-2">
            {m.unklar.map((fid) => {
              const f = offeneFrage(fid);
              if (!f) return null;
              return (
                <li key={fid} className="rounded-2xl bg-muted/60 p-3 text-sm leading-relaxed">
                  <p className="font-bold">
                    {f.id}: {f.frage}
                  </p>
                  <p>{f.entscheidung}</p>
                </li>
              );
            })}
          </ul>
        </Abschnitt>
      )}

      {m.art === "einheit" && (
        <Abschnitt titel="Dein Weg durch diese Methode">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STUFEN.map((st) => {
              const erledigt = st.nr === 1 && verstanden;
              const offen = st.nr === 1;
              return (
                <li
                  key={st.nr}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border-2 p-3 text-sm",
                    erledigt ? "border-primary bg-primary/10" : offen ? "border-primary/60" : "opacity-60",
                  )}
                >
                  <span className="flex items-center gap-1 font-bold">
                    {erledigt ? <CheckCircle2 className="h-4 w-4 text-primary" /> : !offen && <Lock className="h-3.5 w-3.5" />}
                    {st.nr}. {st.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{st.beschreibung}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-muted-foreground">Die Stufen 2–8 kommen mit den Übungsarten ab Phase 4.</p>
        </Abschnitt>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-2 pt-6 md:bottom-0 md:pb-4">
        <Button size="lg" className="w-full" variant={verstanden ? "outline" : "default"} onClick={umschalten}>
          {verstanden ? <CheckCircle2 /> : <Check />}
          {verstanden ? "Verstanden – zurücksetzen" : "Methode verstanden"}
        </Button>
      </div>

      <Abschnitt titel="Quellen">
        <ul className="flex flex-col gap-2 text-sm">
          {m.quellen.map((q, i) => (
            <li key={i} className="flex flex-wrap items-center gap-1.5">
              <HerkunftBadge herkunft={q.herkunft} />
              {q.url ? (
                <a href={q.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                  {q.titel} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="font-semibold">{q.titel}</span>
              )}
              {[q.datum && new Date(q.datum).toLocaleDateString("de-CH"), q.laenge, q.fundstelle].filter(Boolean).length > 0 && (
                <span className="text-muted-foreground">
                  · {[q.datum && new Date(q.datum).toLocaleDateString("de-CH"), q.laenge, q.fundstelle].filter(Boolean).join(" · ")}
                </span>
              )}
            </li>
          ))}
          {m.hinweis && <li className="text-muted-foreground">{m.hinweis}</li>}
        </ul>
      </Abschnitt>

      {weitereVideos.length > 0 && (
        <details className="rounded-2xl border-2 p-4">
          <summary className="cursor-pointer font-bold">Weitere Videos zum Untertest ({weitereVideos.length}, ohne Notizen)</summary>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {weitereVideos.map((v) => (
              <li key={v.videoId}>
                <a
                  className="text-primary hover:underline"
                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {v.typ === "short" ? "Short: " : ""}
                  {v.titel}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
