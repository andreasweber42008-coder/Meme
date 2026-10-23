import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "@/hooks/useAuth";
import { DatenProvider } from "@/daten/DatenProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { KonfigurationFehlt } from "@/components/KonfigurationFehlt";
import Login from "@/pages/Login";
import PasswortNeu from "@/pages/PasswortNeu";
import Start from "@/pages/Start";
import NichtGefunden from "@/pages/NichtGefunden";

// Seiten werden erst bei Bedarf geladen (der Service Worker hält sie trotzdem offline bereit)
const Methoden = lazy(() => import("@/pages/Methoden"));
const MethodeDetail = lazy(() => import("@/pages/MethodeDetail"));
const Pfad = lazy(() => import("@/pages/Pfad"));
const Lektion = lazy(() => import("@/pages/Lektion"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Einstufung = lazy(() => import("@/pages/Einstufung"));
const Woche = lazy(() => import("@/pages/Woche"));
const Fehlerheft = lazy(() => import("@/pages/Fehlerheft"));
const Statistik = lazy(() => import("@/pages/Statistik"));
const Einstellungen = lazy(() => import("@/pages/Einstellungen"));
const Offiziell = lazy(() => import("@/pages/Offiziell"));
const Ueben = lazy(() => import("@/pages/Ueben"));
const Mehr = lazy(() => import("@/pages/Mehr"));
const KonzDruck = lazy(() => import("@/pages/KonzDruck"));
const MaterialBibliothek = lazy(
  () => import("@/pages/material/MaterialBibliothek"),
);
const MaterialPruefen = lazy(() => import("@/pages/material/MaterialPruefen"));
const MaterialLauf = lazy(() => import("@/pages/material/MaterialLauf"));
const Lernkarten = lazy(() => import("@/pages/material/Lernkarten"));
const Simulation = lazy(() => import("@/pages/simulation/Simulation"));
const SimulationLauf = lazy(() => import("@/pages/simulation/SimulationLauf"));
const SimulationErgebnis = lazy(
  () => import("@/pages/simulation/SimulationErgebnis"),
);
const SimulationDruck = lazy(
  () => import("@/pages/simulation/SimulationDruck"),
);
const SimulationPapier = lazy(
  () => import("@/pages/simulation/SimulationPapier"),
);
const Generalprobe = lazy(() => import("@/pages/Generalprobe"));
const Fokus = lazy(() => import("@/pages/Fokus"));

const laden = (
  <div className="flex justify-center py-20" aria-busy="true">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

export default function App() {
  if (!supabase) return <KonfigurationFehlt />;
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DatenProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/passwort-neu"
                element={
                  <RequireAuth>
                    <PasswortNeu />
                  </RequireAuth>
                }
              />
              <Route
                path="/*"
                element={
                  <RequireAuth>
                    <AppShell>
                      <Suspense fallback={laden}>
                        <Routes>
                          <Route index element={<Start />} />
                          <Route path="methoden" element={<Methoden />} />
                          <Route
                            path="methoden/:id"
                            element={<MethodeDetail />}
                          />
                          <Route path="pfad" element={<Pfad />} />
                          <Route
                            path="lektion/:methodeId/:stufe?"
                            element={<Lektion />}
                          />
                          <Route path="onboarding" element={<Onboarding />} />
                          <Route path="einstufung" element={<Einstufung />} />
                          <Route path="woche" element={<Woche />} />
                          <Route path="fehlerheft" element={<Fehlerheft />} />
                          <Route path="statistik" element={<Statistik />} />
                          <Route
                            path="einstellungen"
                            element={<Einstellungen />}
                          />
                          <Route path="offiziell" element={<Offiziell />} />
                          <Route path="ueben" element={<Ueben />} />
                          <Route path="mehr" element={<Mehr />} />
                          <Route path="konz/druck" element={<KonzDruck />} />
                          <Route
                            path="material"
                            element={<MaterialBibliothek />}
                          />
                          <Route
                            path="material/:id/pruefen"
                            element={<MaterialPruefen />}
                          />
                          <Route
                            path="material/:id"
                            element={<MaterialLauf />}
                          />
                          <Route path="karten" element={<Lernkarten />} />
                          <Route path="simulation" element={<Simulation />} />
                          <Route
                            path="simulation/lauf/:id"
                            element={<SimulationLauf />}
                          />
                          <Route
                            path="simulation/ergebnis/:id"
                            element={<SimulationErgebnis />}
                          />
                          <Route
                            path="simulation/druck"
                            element={<SimulationDruck />}
                          />
                          <Route
                            path="simulation/papier/:seed"
                            element={<SimulationPapier />}
                          />
                          <Route
                            path="generalprobe"
                            element={<Generalprobe />}
                          />
                          <Route path="fokus" element={<Fokus />} />
                          <Route path="*" element={<NichtGefunden />} />
                        </Routes>
                      </Suspense>
                    </AppShell>
                  </RequireAuth>
                }
              />
            </Routes>
          </BrowserRouter>
        </DatenProvider>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
