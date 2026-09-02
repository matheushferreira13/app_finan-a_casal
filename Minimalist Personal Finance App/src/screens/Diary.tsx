import { useState } from "react";

type Entry = {
  id: number;
  who: "João" | "Ana";
  avatar: "J" | "A";
  desc: string;
  value: number;
  time: string;
  date: string;
  cat: string;
};

const entries: Entry[] = [
  { id: 1, who: "Ana", avatar: "A", desc: "Farmácia", value: -67.5, time: "14:22", date: "Hoje", cat: "Saúde" },
  { id: 2, who: "João", avatar: "J", desc: "Pastel + Suco", value: -15, time: "13:05", date: "Hoje", cat: "Alimentação" },
  { id: 3, who: "Ana", avatar: "A", desc: "iFood — Almoço", value: -48.9, time: "12:10", date: "Hoje", cat: "Alimentação" },
  { id: 4, who: "João", avatar: "J", desc: "Estacionamento", value: -12, time: "09:30", date: "Hoje", cat: "Carro" },
  { id: 5, who: "Ana", avatar: "A", desc: "Academia", value: -89, time: "08:00", date: "Hoje", cat: "Saúde" },
  { id: 6, who: "João", avatar: "J", desc: "Gasolina", value: -180, time: "18:45", date: "Ontem", cat: "Carro" },
  { id: 7, who: "Ana", avatar: "A", desc: "Mercado Extra", value: -213.4, time: "17:20", date: "Ontem", cat: "Mercado" },
  { id: 8, who: "João", avatar: "J", desc: "Cerveja — Boteco Alfa", value: -62, time: "21:00", date: "Ontem", cat: "Lazer" },
  { id: 9, who: "Ana", avatar: "A", desc: "Uber", value: -22.5, time: "08:15", date: "Ontem", cat: "Transporte" },
  { id: 10, who: "João", avatar: "J", desc: "Almoço trabalho", value: -35, time: "12:30", date: "29 ago", cat: "Alimentação" },
  { id: 11, who: "Ana", avatar: "A", desc: "Shampoo + creme", value: -94.8, time: "19:00", date: "29 ago", cat: "Cuidados" },
  { id: 12, who: "João", avatar: "J", desc: "Manutenção carro", value: -450, time: "10:00", date: "28 ago", cat: "Carro" },
];

const grouped: Record<string, Entry[]> = entries.reduce((acc: Record<string, Entry[]>, e) => {
  if (!acc[e.date]) acc[e.date] = [];
  acc[e.date].push(e);
  return acc;
}, {});

const filters = ["Todos", "João", "Ana", "Alimentação", "Carro", "Saúde"];

export default function Diary() {
  const [filter, setFilter] = useState("Todos");

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

  const jTotal = entries.filter((e) => e.who === "João").reduce((s, e) => s + e.value, 0);
  const aTotal = entries.filter((e) => e.who === "Ana").reduce((s, e) => s + e.value, 0);

  return (
    <div className="h-full flex flex-col bg-white">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background: "#000", padding: "52px 24px 20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#666", marginBottom: "4px" }}>
          DIÁRIO DE GASTOS
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>Agosto 2026</h1>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#888" }}>
            Hoje {totalToday.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* ── PER-PERSON SUMMARY ─────────────────────────── */}
      <div style={{ background: "#000", padding: "0 16px 20px", display: "flex", gap: "8px" }}>
        {[
          { name: "João", initial: "J", total: jTotal },
          { name: "Ana", initial: "A", total: aTotal },
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
                    background: entry.avatar === "J" ? "#000" : "#444",
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
