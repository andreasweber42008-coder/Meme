/** Übersetzt Fehlermeldungen von Supabase Auth in kurze Schweizer Hinweise. */
export function authFehlerText(meldung: string | undefined | null): string {
  const m = (meldung ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-Mail oder Passwort stimmt nicht.";
  if (m.includes("email not confirmed")) return "Bestätige zuerst deine E-Mail-Adresse über den Link im Mail.";
  if (
    m.includes("registrierung gesperrt") ||
    m.includes("database error saving new user") ||
    m.includes("signups not allowed") ||
    m.includes("signup is disabled")
  )
    return "Die Registrierung ist gesperrt. Diese App hat schon ein Konto.";
  if (m.includes("user already registered")) return "Für diese E-Mail gibt es schon ein Konto. Melde dich an.";
  if (m.includes("password") && (m.includes("at least") || m.includes("weak")))
    return "Das Passwort ist zu schwach. Nimm mindestens 10 Zeichen.";
  if (m.includes("rate limit") || m.includes("too many")) return "Zu viele Versuche. Warte kurz und probier es nochmals.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Keine Verbindung. Prüf dein Internet.";
  return "Das hat nicht geklappt. Probier es nochmals.";
}

export const MIN_PASSWORT_LAENGE = 10;
