import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export type Household = { id: string; name: string; currency: string };

export function useHousehold(userId: string | undefined) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      const access = await supabase.rpc("ensure_household_access");
      if (access.error || !access.data) {
        if (active) setError(access.error?.message ?? "Não foi possível acessar a casa.");
        setLoading(false);
        return;
      }

      const householdId = access.data.id;

      const result = await supabase
        .from("households")
        .select("id, name, currency")
        .eq("id", householdId)
        .single();

      if (active) {
        if (result.error) setError(result.error.message);
        else setHousehold(result.data);
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { household, loading, error };
}
