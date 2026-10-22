import type { Ablage, Dokument, Sammlung } from "./typen";

type Zuhoerer = () => void;

/**
 * Lokaler Datenspeicher (offline-first). Alle Änderungen landen sofort im Speicher und in der Ablage
 * und werden im Hintergrund mit Lovable Cloud abgeglichen. Konflikte: Die letzte Änderung gewinnt.
 */
export class Datenspeicher {
  private doks = new Map<string, Map<string, Dokument>>();
  private zuhoerer = new Map<string, Set<Zuhoerer>>();
  private alleZuhoerer = new Set<Zuhoerer>();
  private versionen = new Map<string, number>();
  geladen = false;
  aenderungsHaken: (() => void) | null = null;

  constructor(private ablage: Ablage) {}

  async laden(): Promise<void> {
    const liste = await this.ablage.alleLaden();
    this.doks.clear();
    for (const d of liste) this.ablegen(d);
    this.geladen = true;
    this.benachrichtigen([...this.doks.keys()]);
  }

  private ablegen(d: Dokument) {
    let m = this.doks.get(d.sammlung);
    if (!m) this.doks.set(d.sammlung, (m = new Map()));
    m.set(d.id, d);
  }

  version(sammlung: string): number {
    return this.versionen.get(sammlung) ?? 0;
  }

  /** Alle nicht gelöschten Dokumente einer Sammlung */
  alle<T>(sammlung: Sammlung): Array<T & { id: string }> {
    const m = this.doks.get(sammlung);
    if (!m) return [];
    const out: Array<T & { id: string }> = [];
    for (const d of m.values()) if (!d.geloescht) out.push({ ...(d.daten as T), id: d.id });
    return out;
  }

  hole<T>(sammlung: Sammlung, id: string): (T & { id: string }) | undefined {
    const d = this.doks.get(sammlung)?.get(id);
    return d && !d.geloescht ? { ...(d.daten as T), id: d.id } : undefined;
  }

  async speichern<T extends object>(sammlung: Sammlung, id: string, daten: T): Promise<void> {
    const rein = { ...daten } as Record<string, unknown>;
    delete rein.id;
    const d: Dokument = { sammlung, id, daten: rein, geloescht: false, geaendert: this.jetzt(sammlung, id), synchron: false };
    this.ablegen(d);
    this.benachrichtigen([sammlung]);
    await this.ablage.schreiben([d]);
    this.aenderungsHaken?.();
  }

  /** Teilweise ändern (flach zusammenführen) */
  async aendern<T extends object>(sammlung: Sammlung, id: string, teil: Partial<T>): Promise<void> {
    const alt = this.hole<T>(sammlung, id) ?? {};
    await this.speichern(sammlung, id, { ...alt, ...teil });
  }

  async loeschen(sammlung: Sammlung, id: string): Promise<void> {
    const alt = this.doks.get(sammlung)?.get(id);
    const d: Dokument = { sammlung, id, daten: alt?.daten ?? {}, geloescht: true, geaendert: this.jetzt(sammlung, id), synchron: false };
    this.ablegen(d);
    this.benachrichtigen([sammlung]);
    await this.ablage.schreiben([d]);
    this.aenderungsHaken?.();
  }

  /** Zeitstempel, der für dasselbe Dokument immer steigt (auch bei schnellen Änderungen). */
  private jetzt(sammlung: string, id: string): number {
    const alt = this.doks.get(sammlung)?.get(id)?.geaendert ?? 0;
    return Math.max(Date.now(), alt + 1);
  }

  nichtSynchron(): Dokument[] {
    const out: Dokument[] = [];
    for (const m of this.doks.values()) for (const d of m.values()) if (!d.synchron) out.push(d);
    return out;
  }

  async alsSynchronMarkieren(liste: Dokument[]): Promise<void> {
    const geaendert: Dokument[] = [];
    for (const d of liste) {
      const aktuell = this.doks.get(d.sammlung)?.get(d.id);
      // Nur markieren, wenn seither nicht erneut geändert
      if (aktuell && aktuell.geaendert === d.geaendert && !aktuell.synchron) {
        aktuell.synchron = true;
        geaendert.push(aktuell);
      }
    }
    if (geaendert.length) await this.ablage.schreiben(geaendert);
  }

  /** Fremde Stände (Server, Backup) einmischen: Die letzte Änderung gewinnt. Gibt die Anzahl übernommener zurück. */
  async einmischen(liste: Array<Omit<Dokument, "synchron">>, synchron = true): Promise<number> {
    const neu: Dokument[] = [];
    const sammlungen = new Set<string>();
    for (const e of liste) {
      const alt = this.doks.get(e.sammlung)?.get(e.id);
      if (alt && alt.geaendert >= e.geaendert) continue;
      const d: Dokument = { ...e, synchron };
      this.ablegen(d);
      neu.push(d);
      sammlungen.add(e.sammlung);
    }
    if (neu.length) {
      await this.ablage.schreiben(neu);
      this.benachrichtigen([...sammlungen]);
      if (!synchron) this.aenderungsHaken?.();
    }
    return neu.length;
  }

  exportieren(): Array<Omit<Dokument, "synchron">> {
    const out: Array<Omit<Dokument, "synchron">> = [];
    for (const m of this.doks.values())
      for (const d of m.values()) out.push({ sammlung: d.sammlung, id: d.id, daten: d.daten, geloescht: d.geloescht, geaendert: d.geaendert });
    return out;
  }

  metaLesen(k: string) {
    return this.ablage.metaLesen(k);
  }

  metaSchreiben(k: string, w: string) {
    return this.ablage.metaSchreiben(k, w);
  }

  async leeren(): Promise<void> {
    await this.ablage.leeren();
    const alle = [...this.doks.keys()];
    this.doks.clear();
    this.benachrichtigen(alle);
  }

  abonnieren(sammlung: string | "*", cb: Zuhoerer): () => void {
    if (sammlung === "*") {
      this.alleZuhoerer.add(cb);
      return () => this.alleZuhoerer.delete(cb);
    }
    let s = this.zuhoerer.get(sammlung);
    if (!s) this.zuhoerer.set(sammlung, (s = new Set()));
    s.add(cb);
    return () => s!.delete(cb);
  }

  private benachrichtigen(sammlungen: string[]) {
    for (const s of sammlungen) {
      this.versionen.set(s, (this.versionen.get(s) ?? 0) + 1);
      this.zuhoerer.get(s)?.forEach((cb) => cb());
    }
    this.alleZuhoerer.forEach((cb) => cb());
  }
}
