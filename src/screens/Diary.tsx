import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Entry = {
  id: string;
  who: "Matheus" | "Luana";
  avatar: "M" | "L";
  desc: string;
  value: number;
  time: string;
  date: string;
  cat: string;
};

const filters = ["Todos", "Matheus", "Luana", "Alimentação", "Carro", "Saúde"];

export default function Diary({ householdId }: { householdId: string }) {
  const [filter, setFilter] = useState("Todos");
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data }, { data: profiles }] = await Promise.all([
        supabase.from("transactions").select("id,description,amount,kind,occurred_at,payer_user_id,category:categories(name)").eq("household_id", householdId).order("occurred_at", { ascending: false }),
        supabase.from("profiles").select("id,name").eq("household_id", householdId),
      ]);
      const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.name]));
      setEntries((data ?? []).map((item: any) => { const name = names.get(item.payer_user_id) ?? "Matheus"; return { id: item.id, who: name.startsWith("Luana") ? "Luana" : "Matheus", avatar: name.startsWith("Luana") ? "L" : "M", desc: item.description, value: item.kind === "expense" ? -Number(item.amount) : Number(item.amount), time: new Date(item.occurred_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), date: new Date(item.occurred_at).toLocaleDateString("pt-BR"), cat: item.category?.name ?? "Outros" }; }));
    }
    void load();
    const channel = supabase.channel(`diary-${householdId}`).on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `household_id=eq.${householdId}` }, load).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [householdId]);

  const grouped: Record<string, Entry[]> = entries.reduce((acc: Record<string, Entry[]>, entry) => { (acc[entry.date] ??= []).push(entry); return acc; }, {});

  const filtered: Record<string, Entry[]> =
    filter === "Todos"
      ? grouped
      : (Object.fromEntries(
          Object.entries(grouped)
            .map(([date, items]): [string, Entry[]] => [
              date,
              items.filter((e) => e.who === filter || e.cat === filter),
            ])
            .filter(([, items]) => items.length > 0)
        ) as Record<string, Entry[]>);

  const totalToday = entries
    .filter((e) => e.date === "Hoje")
    .reduce((s, e) => s + e.value, 0);

  const matheusTotal = entries.filter((e) => e.who === "Matheus").reduce((s, e) => s + e.value, 0);
  const luanaTotal = entries.filter((e) => e.who === "Luana").reduce((s, e) => s + e.value, 0);
  const currentMonth = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="h-full flex flex-col bg-white">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background: "#000", padding: "52px 24px 20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#666", marginBottom: "4px" }}>
          DIÁRIO DE GASTOS
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>{currentMonth}</h1>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#888" }}>
            Hoje {totalToday.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* ── PER-PERSON SUMMARY ─────────────────────────── */}
      <div style={{ background: "#000", padding: "0 16px 20px", display: "flex", gap: "8px" }}>
        {[
          { name: "Matheus", initial: "M", total: matheusTotal },
          { name: "Luana", initial: "L", total: luanaTotal },
        ].map((p) => (
          <div key={p.name} style={{
            flex: 1, background: "#1a1a1a",
            border: "1px solid #2a2a2a", borderRadius: "4px",
            padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: p.initial === "J" ? "#fff" : "#555",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: p.initial === "J" ? "#000" : "#fff",
              fontSize: "12px", fontWeight: 700, flexShrink: 0,
            }}>
              {p.initial}
            </div>
            <div>
              <p style={{ fontSize: "10px", color: "#666", letterSpacing: "0.06em" }}>{p.name.toUpperCase()}</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                {p.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── FILTERS ────────────────────────────────────── */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f0f0f0" }}>
        <div
          style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none" as const }}
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 12px",
                border: "1px solid",
                borderColor: filter === f ? "#000" : "#ddd",
                background: filter === f ? "#000" : "#fff",
                color: filter === f ? "#fff" : "#666",
                fontSize: "10px", fontWeight: filter === f ? 700 : 400,
                letterSpacing: "0.08em", borderRadius: "2px",
                whiteSpace: "nowrap" as const, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEED ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {Object.entries(filtered).map(([date, items]) => (
          <div key={date}>
            {/* Date group header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "8px",
            }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "#aaa" }}>
                {date.toUpperCase()}
              </p>
              <p style={{ fontSize: "11px", color: "#bbb" }}>
                {items.reduce((s, e) => s + e.value, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>

            {/* Card container per group */}
            <div style={{ border: "1px solid #ececec", borderRadius: "6px", overflow: "hidden" }}>
              {items.map((entry, i) => (
                <div key={entry.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  padding: "12px 14px",
                  borderTop: i > 0 ? "1px solid #f5f5f5" : "none",
                  background: "#fff",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                    background: entry.avatar === "M" ? "#000" : "#444",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "12px", fontWeight: 700,
                  }}>
                    {entry.avatar}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                      <div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#000", letterSpacing: "0.02em" }}>
                          {entry.who}
                        </span>
                        <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "4px" }}>
                          gastou em
                        </span>
                      </div>
                      <span style={{
                        fontSize: "14px", fontWeight: 700,
                        color: "#000", letterSpacing: "-0.02em",
                        whiteSpace: "nowrap" as const,
                      }}>
                        {entry.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>

                    <p style={{ fontSize: "13px", color: "#222", marginTop: "2px", fontWeight: 500 }}>
                      {entry.desc}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                      <span style={{
                        fontSize: "10px", color: "#666",
                        background: "#f0f0f0", padding: "2px 8px", borderRadius: "2px",
                        letterSpacing: "0.04em",
                      }}>
                        {entry.cat.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "10px", color: "#ccc" }}>{entry.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: "8px" }} />
      </div>
    </div>
  );
}
