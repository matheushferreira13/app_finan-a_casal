import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Transaction = { amount: number; kind: string };

export default function WeeklySummaryNotification({ householdId }: { householdId: string }) {
  const [summary, setSummary] = useState<{ income: number; expenses: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase.from("profiles").select("notifications").eq("household_id", householdId).limit(1).maybeSingle();
      const preferences = profile?.notifications as Record<string, boolean> | null;
      if (!preferences?.weekly_summary) return;

      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("transactions").select("amount,kind").eq("household_id", householdId).gte("occurred_at", start.toISOString());
      const transactions = (data ?? []) as Transaction[];
      const income = transactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + Number(item.amount), 0);
      const expenses = transactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
      setSummary({ income, expenses });
      setVisible(true);
    }
    void load();
  }, [householdId]);

  if (!visible || !summary) return null;
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return <aside className="absolute left-3 right-3 top-3 z-50 border border-zinc-800 bg-black p-4 text-white shadow-2xl">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold tracking-[0.16em] text-zinc-500">RESUMO DA SEMANA</p><p className="mt-1 text-sm font-semibold">Como estão as finanças?</p></div><button onClick={() => setVisible(false)} className="text-xl leading-none text-zinc-500" aria-label="Fechar resumo">×</button></div>
    <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><p className="text-zinc-500">ENTROU</p><strong>{money(summary.income)}</strong></div><div><p className="text-zinc-500">GASTO</p><strong>{money(summary.expenses)}</strong></div><div><p className="text-zinc-500">RESTOU</p><strong>{money(summary.income - summary.expenses)}</strong></div></div>
  </aside>;
}
