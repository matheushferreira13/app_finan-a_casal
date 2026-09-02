import { useState } from "react";
import type { Goal } from "../data/goals";

const barData = [
  { month: "Mai", in: 6800, out: 4200 },
  { month: "Jun", in: 7200, out: 5100 },
  { month: "Jul", in: 6500, out: 3800 },
  { month: "Ago", in: 8400, out: 5600 },
];

const transactions = [
  { id: 1, who: "João", avatar: "J", desc: "Aluguel", value: -2800, date: "Hoje", cat: "Moradia" },
  { id: 2, who: "Ana", avatar: "A", desc: "Salário", value: 4200, date: "Hoje", cat: "Renda" },
  { id: 3, who: "João", avatar: "J", desc: "Gasolina", value: -180, date: "Ontem", cat: "Carro" },
  { id: 4, who: "Ana", avatar: "A", desc: "Supermercado", value: -340, date: "Ontem", cat: "Alimentação" },
  { id: 5, who: "João", avatar: "J", desc: "Freelance", value: 1500, date: "29 ago", cat: "Renda" },
];

const maxBar = Math.max(...barData.flatMap((d) => [d.in, d.out]));

export default function Dashboard({ goals = [] }: { goals: Goal[] }) {
  const [activeBar, setActiveBar] = useState(3);

  const totalIn = 8400;
  const totalOut = 5600;
  const balance = totalIn - totalOut;

  return (
    <div className="h-full overflow-y-auto bg-white" style={{ scrollbarWidth: "none" }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background: "#000", padding: "52px 24px 24px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#666", marginBottom: "4px" }}>
          AGOSTO 2026
        </p>
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>
            João & Ana
          </h1>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            border: "2px solid #444", background: "#1a1a1a",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "12px", fontWeight: 700,
          }}>
            JA
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
            const pct = Math.round((g.current / g.target) * 100);
            return (
              <div key={g.label} style={{
                padding: "14px 16px",
                border: "1px solid #e8e8e8",
                borderRadius: "4px",
                background: "#fafafa",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>{g.label}</p>
                  <p style={{ fontSize: "10px", color: "#999", letterSpacing: "0.04em" }}>{g.deadline}</p>
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
                    R$ {g.current.toLocaleString("pt-BR")}
                  </span>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, color: "#fff",
                    background: "#000", padding: "1px 7px", borderRadius: "2px",
                  }}>
                    {pct}%
                  </span>
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    R$ {g.target.toLocaleString("pt-BR")}
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
                background: t.avatar === "J" ? "#000" : "#444",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "12px", fontWeight: 700, flexShrink: 0,
              }}>
                {t.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>{t.desc}</p>
                <p style={{ fontSize: "11px", color: "#999", marginTop: "1px" }}>
                  {t.who} · {t.date}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#000", letterSpacing: "-0.02em" }}>
                  {t.value > 0 ? "+" : ""}{t.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p style={{ fontSize: "10px", color: "#bbb", marginTop: "2px" }}>{t.cat}</p>
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
