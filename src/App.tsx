import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Methoden from "@/pages/Methoden";
import MethodeDetail from "@/pages/MethodeDetail";
import NichtGefunden from "@/pages/NichtGefunden";
import Pfad from "@/pages/Pfad";
import Lektion from "@/pages/Lektion";
import Onboarding from "@/pages/Onboarding";
import Einstufung from "@/pages/Einstufung";
import Woche from "@/pages/Woche";
import Fehlerheft from "@/pages/Fehlerheft";
import Statistik from "@/pages/Statistik";
import Einstellungen from "@/pages/Einstellungen";
import Offiziell from "@/pages/Offiziell";
import Ueben from "@/pages/Ueben";
import Mehr from "@/pages/Mehr";
import KonzDruck from "@/pages/KonzDruck";
import MaterialBibliothek from "@/pages/material/MaterialBibliothek";
import MaterialPruefen from "@/pages/material/MaterialPruefen";
import MaterialLauf from "@/pages/material/MaterialLauf";
import Lernkarten from "@/pages/material/Lernkarten";

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
                    <Routes>
                      <Route index element={<Start />} />
                      <Route path="methoden" element={<Methoden />} />
                      <Route path="methoden/:id" element={<MethodeDetail />} />
                      <Route path="pfad" element={<Pfad />} />
                      <Route path="lektion/:methodeId/:stufe?" element={<Lektion />} />
                      <Route path="onboarding" element={<Onboarding />} />
                      <Route path="einstufung" element={<Einstufung />} />
                      <Route path="woche" element={<Woche />} />
                      <Route path="fehlerheft" element={<Fehlerheft />} />
                      <Route path="statistik" element={<Statistik />} />
                      <Route path="einstellungen" element={<Einstellungen />} />
                      <Route path="offiziell" element={<Offiziell />} />
                      <Route path="ueben" element={<Ueben />} />
                      <Route path="mehr" element={<Mehr />} />
                      <Route path="konz/druck" element={<KonzDruck />} />
                      <Route path="material" element={<MaterialBibliothek />} />
                      <Route path="material/:id/pruefen" element={<MaterialPruefen />} />
                      <Route path="material/:id" element={<MaterialLauf />} />
                      <Route path="karten" element={<Lernkarten />} />
                      <Route path="*" element={<NichtGefunden />} />
                    </Routes>
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
