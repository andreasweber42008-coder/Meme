import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FortschrittZeile = Database["public"]["Tables"]["methoden_fortschritt"]["Row"];

const SCHLUESSEL = ["methoden_fortschritt"] as const;

export function useFortschritt() {
  return useQuery({
    queryKey: SCHLUESSEL,
    enabled: !!supabase,
    queryFn: async (): Promise<Record<string, FortschrittZeile>> => {
      const { data, error } = await supabase!.from("methoden_fortschritt").select("*");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((z) => [z.methode_id, z]));
    },
  });
}

export function useVerstandenMarkieren() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ methodeId, verstanden }: { methodeId: string; verstanden: boolean }) => {
      const { error } = await supabase!
        .from("methoden_fortschritt")
        .upsert(
          { methode_id: methodeId, verstanden_am: verstanden ? new Date().toISOString() : null },
          { onConflict: "user_id,methode_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: SCHLUESSEL }),
  });
}
