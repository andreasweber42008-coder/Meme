import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { Datenspeicher } from "./store";

export type AbgleichStatus = "bereit" | "laeuft" | "offline" | "fehler";

const PAKET = 200;

/** Gleicht den lokalen Speicher mit der Tabelle «dokumente» ab: erst hochladen, dann Neues holen. */
export class Abgleich {
  status: AbgleichStatus = "bereit";
  letzter: number | null = null;
  private laeuft = false;
  private nochmal = false;
  private zuhoerer = new Set<() => void>();

  constructor(
    private store: Datenspeicher,
    private client: SupabaseClient<Database>,
    private userId: string,
  ) {}

  abonnieren(cb: () => void) {
    this.zuhoerer.add(cb);
    return () => this.zuhoerer.delete(cb);
  }

  private setzen(s: AbgleichStatus) {
    this.status = s;
    this.zuhoerer.forEach((cb) => cb());
  }

  async jetzt(): Promise<void> {
    if (this.laeuft) {
      this.nochmal = true;
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.setzen("offline");
      return;
    }
    this.laeuft = true;
    this.setzen("laeuft");
    try {
      const offen = this.store.nichtSynchron();
      for (let i = 0; i < offen.length; i += PAKET) {
        const paket = offen.slice(i, i + PAKET);
        const eintraege = paket.map((d) => ({
          sammlung: d.sammlung,
          id: d.id,
          daten: d.daten as Json,
          geloescht: d.geloescht,
          geaendert_am: new Date(d.geaendert).toISOString(),
        }));
        const { error } = await this.client.rpc("dokumente_speichern", { eintraege });
        if (error) throw error;
        await this.store.alsSynchronMarkieren(paket);
      }

      const schluessel = `cursor:${this.userId}`;
      let cursor = (await this.store.metaLesen(schluessel)) ?? "1970-01-01T00:00:00Z";
      for (;;) {
        const { data, error } = await this.client
          .from("dokumente")
          .select("sammlung,id,daten,geloescht,geaendert_am,server_am")
          .gt("server_am", cursor)
          .order("server_am", { ascending: true })
          .limit(500);
        if (error) throw error;
        if (!data?.length) break;
        await this.store.einmischen(
          data.map((z) => ({ sammlung: z.sammlung, id: z.id, daten: z.daten, geloescht: z.geloescht, geaendert: Date.parse(z.geaendert_am) })),
        );
        cursor = data[data.length - 1].server_am;
        await this.store.metaSchreiben(schluessel, cursor);
        if (data.length < 500) break;
      }
      this.letzter = Date.now();
      this.setzen("bereit");
    } catch {
      this.setzen(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "fehler");
    } finally {
      this.laeuft = false;
      if (this.nochmal) {
        this.nochmal = false;
        void this.jetzt();
      }
    }
  }
}
