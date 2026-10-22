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
