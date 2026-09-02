import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Goal = { id: string; name: string; target_amount: number; current_amount: number; target_date: string | null };
type Transaction = { id: string; description: string; amount: number; kind: string; occurred_at: string; category?: { name: string }[] | null };

export default function Dashboard({ householdId }: { householdId: string }) {
  const [activeBar, setActiveBar] = useState(3);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [barData, setBarData] = useState<{ month: string; in: number; out: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [tx, goalResult] = await Promise.all([
        supabase.from("transactions").select("id,description,amount,kind,occurred_at,category:categories(name)").eq("household_id", householdId).order("occurred_at", { ascending: false }),
        supabase.from("goals").select("id,name,target_amount,current_amount,target_date").eq("household_id", householdId),
      ]);
      const rows = (tx.data ?? []) as Transaction[];
      setTransactions(rows.slice(0, 20));
      setGoals((goalResult.data ?? []) as Goal[]);
      const months = Array.from({ length: 4 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (3 - index)); return date; });
      setBarData(months.map((date) => { const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""); const monthRows = rows.filter((item) => { const occurred = new Date(item.occurred_at); return occurred.getMonth() === date.getMonth() && occurred.getFullYear() === date.getFullYear(); }); return { month, in: monthRows.filter((item) => item.kind === "income").reduce((sum, item) => sum + Number(item.amount), 0), out: monthRows.filter((item) => item.kind === "expense").reduce((sum, item) => sum + Number(item.amount), 0) }; }));
    }
    void load();
    const channel = supabase
      .channel(`dashboard-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `household_id=eq.${householdId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `household_id=eq.${householdId}` }, load)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  const totalIn = transactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const totalOut = transactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIn - totalOut;
  const maxBar = Math.max(...barData.flatMap((data) => [data.in, data.out]), 1);
  const currentMonth = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date()).toUpperCase();
  if (barData.length === 0) return <div className="h-full bg-white" />;

  return (
    <div className="h-full overflow-y-auto bg-white" style={{ scrollbarWidth: "none" }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background: "#000", padding: "52px 24px 24px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#666", marginBottom: "4px" }}>
          {currentMonth}
        </p>
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
            Matheus & Luana
          </h1>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            border: "2px solid #444", background: "#1a1a1a",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "12px", fontWeight: 700,
          }}>
            ML
          </div>
        </div>
      </div>

      {/* ── SALDO HERO ─────────────────────────────────── */}
      <div style={{ background: "#000", padding: "0 24px 28px" }}>
        <p style={{ fontSize: "11px", color: "#555", letterSpacing: "0.1em", marginBottom: "6px" }}>
          SALDO DO MÊS
        </p>
        <p style={{ fontSize: "38px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
          {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      {/* ── STATS 3-COLUMN ─────────────────────────────── */}
      <div style={{ padding: "0 16px", marginTop: "-1px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", paddingTop: "16px" }}>
          <StatCard label="Entradas" value={totalIn} accent="#000" />
          <StatCard label="Saídas" value={totalOut} accent="#666" />
          <StatCard label="Diferença" value={balance} accent="#333" bold />
        </div>
      </div>

      {/* ── FLUXO MENSAL ───────────────────────────────── */}
      <SectionContainer label="FLUXO MENSAL">
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "100px" }}>
          {barData.map((d, i) => {
            const isActive = i === activeBar;
            return (
              <button
                key={d.month}
                onClick={() => setActiveBar(i)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", cursor: "pointer", background: "none", border: "none", padding: 0 }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "76px", width: "100%" }}>
                  <div style={{
                    flex: 1, borderRadius: "2px 2px 0 0",
                    height: `${(d.in / maxBar) * 100}%`,
                    background: isActive ? "#000" : "#e0e0e0",
                    transition: "background 0.2s, height 0.3s",
                  }} />
                  <div style={{
                    flex: 1, borderRadius: "2px 2px 0 0",
                    height: `${(d.out / maxBar) * 100}%`,
                    background: isActive ? "#888" : "#f0f0f0",
                    transition: "background 0.2s, height 0.3s",
                  }} />
                </div>
                <span style={{
                  fontSize: "10px", letterSpacing: "0.06em",
                  color: isActive ? "#000" : "#aaa",
                  fontWeight: isActive ? 700 : 400,
                }}>
                  {d.month.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected month detail */}
        <div style={{
          marginTop: "16px", padding: "12px 14px",
          background: "#f5f5f5", borderRadius: "4px",
          display: "flex", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontSize: "9px", color: "#999", letterSpacing: "0.1em", marginBottom: "2px" }}>ENTRADAS</p>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#000" }}>
              R$ {(barData[activeBar].in / 1000).toFixed(1)}k
            </p>
          </div>
          <div style={{ width: "1px", background: "#e0e0e0" }} />
          <div>
            <p style={{ fontSize: "9px", color: "#999", letterSpacing: "0.1em", marginBottom: "2px" }}>SAÍDAS</p>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#555" }}>
              R$ {(barData[activeBar].out / 1000).toFixed(1)}k
            </p>
          </div>
          <div style={{ width: "1px", background: "#e0e0e0" }} />
          <div>
            <p style={{ fontSize: "9px", color: "#999", letterSpacing: "0.1em", marginBottom: "2px" }}>SOBRA</p>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#000" }}>
              R$ {((barData[activeBar].in - barData[activeBar].out) / 1000).toFixed(1)}k
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div style={{ width: "8px", height: "8px", background: "#000", borderRadius: "1px" }} />
            <span style={{ fontSize: "10px", color: "#666" }}>Entradas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: "8px", height: "8px", background: "#888", borderRadius: "1px" }} />
            <span style={{ fontSize: "10px", color: "#666" }}>Saídas</span>
          </div>
        </div>
      </SectionContainer>

      {/* ── METAS ──────────────────────────────────────── */}
      <SectionContainer label="METAS & PLANOS FUTUROS">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {goals.map((g) => {
            const pct = Math.min(Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100), 100);
            return (
              <div key={g.id} style={{
                padding: "14px 16px",
                border: "1px solid #e8e8e8",
                borderRadius: "4px",
                background: "#fafafa",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>{g.name}</p>
                  <p style={{ fontSize: "10px", color: "#999", letterSpacing: "0.04em" }}>{g.target_date ?? "Sem prazo"}</p>
                </div>
                <div style={{ height: "5px", background: "#e8e8e8", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: "#000", borderRadius: "3px",
                    transition: "width 0.6s ease",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#000" }}>
                    R$ {Number(g.current_amount).toLocaleString("pt-BR")}
                  </span>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, color: "#fff",
                    background: "#000", padding: "1px 7px", borderRadius: "2px",
                  }}>
                    {pct}%
                  </span>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    R$ {Number(g.target_amount).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionContainer>

      {/* ── ÚLTIMOS LANÇAMENTOS ─────────────────────────── */}
      <SectionContainer label="ÚLTIMOS LANÇAMENTOS" last>
        <div style={{ border: "1px solid #e8e8e8", borderRadius: "4px", overflow: "hidden" }}>
          {transactions.map((t, i) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 14px",
              borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
              background: "#fff",
            }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "50%",
                background: "#000",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "12px", fontWeight: 700, flexShrink: 0,
              }}>
                {t.kind === "income" ? "+" : "-"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>{t.description}</p>
                <p style={{ fontSize: "11px", color: "#999", marginTop: "1px" }}>
                  {new Date(t.occurred_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#000", letterSpacing: "-0.02em" }}>
                  {t.kind === "income" ? "+" : "-"}{Number(t.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p style={{ fontSize: "10px", color: "#bbb", marginTop: "2px" }}>{t.category?.[0]?.name ?? "Outros"}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>

    </div>
  );
}

function StatCard({ label, value, accent, bold }: { label: string; value: number; accent: string; bold?: boolean }) {
  return (
    <div style={{
      padding: "12px 10px",
      border: "1px solid #e8e8e8",
      borderRadius: "4px",
      background: "#fafafa",
    }}>
      <p style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#999", fontWeight: 600, marginBottom: "6px" }}>
        {label.toUpperCase()}
      </p>
      <p style={{
        fontSize: "14px", fontWeight: bold ? 700 : 600, color: accent,
        letterSpacing: "-0.02em", lineHeight: 1,
      }}>
        R${(Math.abs(value) / 1000).toFixed(1)}k
      </p>
    </div>
  );
}

function SectionContainer({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      margin: "12px 16px",
      marginBottom: last ? "16px" : "0",
    }}>
      <p style={{
        fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
        color: "#aaa", marginBottom: "12px",
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}
