import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ORDNER = "supabase/migrations";
const sql = readdirSync(ORDNER)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(ORDNER, f), "utf8"))
  .join("\n");

describe("Migrationen", () => {
  it("aktivieren Row Level Security für jede neue Tabelle", () => {
    const tabellen = [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map((m) => m[1]);
    expect(tabellen.length).toBeGreaterThan(0);
    for (const t of tabellen) {
      expect(sql, t).toMatch(new RegExp(`alter table public\\.${t} enable row level security`, "i"));
      expect(sql, t).toMatch(new RegExp(`on public\\.${t}\\s+for select`, "i"));
    }
  });

  it("sperren weitere Konten per Trigger", () => {
    expect(sql).toMatch(/before insert on auth\.users/i);
    expect(sql).toMatch(/Registrierung gesperrt/);
  });

  it("enthalten keine E-Mail-Adresse", () => {
    expect(sql).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});
