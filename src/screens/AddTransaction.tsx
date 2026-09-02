import { useState } from "react";
import { supabase } from "../supabase";

type TxType = "saida" | "entrada";

const outCategories = [
  "Aluguel", "Água", "Luz", "Internet",
  "Carro", "Gasolina", "Supermercado",
  "Alimentação", "Saúde", "Lazer", "Transporte", "Outros",
];

const inCategories = [
  "Salário", "Bico", "Freelance",
  "Venda", "Investimentos", "Outros",
];

const people = ["Matheus", "Luana"];

export default function AddTransaction({ householdId, userId, onClose }: { householdId: string; userId: string; onClose: () => void }) {
  const [type, setType] = useState<TxType>("saida");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [person, setPerson] = useState("Matheus");
  const [value, setValue] = useState("");
  const [desc, setDesc] = useState("");
  const [saved, setSaved] = useState(false);

  const cats = type === "saida" ? outCategories : inCategories;

  async function handleSave() {
    if (!value || !selectedCat) return;
    const amount = Number(value.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !desc.trim()) return;
    const kind = type === "saida" ? "expense" : "income";
    let payerId = userId;
    if (person === "Luana") {
      const payer = await supabase.from("profiles").select("id").eq("household_id", householdId).eq("name", "Luana").maybeSingle();
      if (payer.data?.id) payerId = payer.data.id;
    }
    const category = await supabase.from("categories").upsert({ household_id: householdId, name: selectedCat, kind }, { onConflict: "household_id,name,kind" }).select("id").single();
    if (category.error) return;
    const result = await supabase.from("transactions").insert({ household_id: householdId, category_id: category.data.id, created_by: userId, payer_user_id: payerId, kind, description: desc.trim(), amount });
    if (result.error) return;
    setSaved(true);
    setTimeout(() => onClose(), 900);
  }

  return (
    <div
      className="absolute inset-0 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.6)", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "10px 10px 0 0",
          maxHeight: "92%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: "40px", height: "4px", background: "#ddd", borderRadius: "2px" }} />
        </div>

        {/* ── HEADER ─────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 20px 16px",
          borderBottom: "1px solid #ebebeb",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#aaa" }}>
              NOVA TRANSAÇÃO
            </p>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#000", marginTop: "2px" }}>
              {saved ? "Salvo com sucesso!" : "Registrar lançamento"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "#f0f0f0", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", color: "#666", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* ── SCROLLABLE BODY ────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Tipo */}
          <FieldGroup label="TIPO DE LANÇAMENTO">
            <div style={{ display: "flex", border: "1px solid #000", borderRadius: "4px", overflow: "hidden" }}>
              {(["saida", "entrada"] as TxType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setType(t); setSelectedCat(null); }}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: type === t ? "#000" : "#fff",
                    color: type === t ? "#fff" : "#888",
                    fontSize: "11px", fontWeight: 700,
                    letterSpacing: "0.1em", border: "none", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {t === "saida" ? "SAÍDA" : "ENTRADA"}
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* Quem */}
          <FieldGroup label="QUEM REALIZOU">
            <div style={{ display: "flex", gap: "8px" }}>
              {people.map((p) => (
                <button
                  key={p}
                  onClick={() => setPerson(p)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "10px 14px",
                    border: "1px solid", borderRadius: "4px",
                    borderColor: person === p ? "#000" : "#ddd",
                    background: person === p ? "#000" : "#fafafa",
                    color: person === p ? "#fff" : "#444",
                    fontSize: "13px", fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: person === p ? "#fff" : (p === "Matheus" ? "#000" : "#555"),
                    color: person === p ? "#000" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: 800,
                  }}>
                    {p[0]}
                  </div>
                  {p}
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* Valor */}
          <FieldGroup label="VALOR">
            <div style={{
              display: "flex", alignItems: "center",
              border: "1px solid #000", borderRadius: "4px",
              padding: "10px 14px", gap: "6px",
            }}>
              <span style={{ fontSize: "22px", fontWeight: 300, color: "#bbb" }}>R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{
                  flex: 1, fontSize: "26px", fontWeight: 700,
                  color: "#000", background: "transparent",
                  border: "none", outline: "none",
                  letterSpacing: "-0.02em",
                }}
              />
            </div>
          </FieldGroup>

          {/* Descrição */}
          <FieldGroup label="DESCRIÇÃO">
            <input
              type="text"
              placeholder={type === "saida" ? "Ex: Pastel no mercadão" : "Ex: Salário mensal"}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "11px 14px", fontSize: "14px", color: "#000",
                background: "#fafafa", border: "1px solid #e0e0e0",
                borderRadius: "4px", outline: "none",
              }}
            />
          </FieldGroup>

          {/* Categoria */}
          <FieldGroup label="CATEGORIA">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCat(c)}
                  style={{
                    padding: "7px 13px",
                    border: "1px solid",
                    borderColor: selectedCat === c ? "#000" : "#ddd",
                    background: selectedCat === c ? "#000" : "#fafafa",
                    color: selectedCat === c ? "#fff" : "#555",
                    fontSize: "12px", fontWeight: selectedCat === c ? 600 : 400,
                    borderRadius: "3px", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* CTA */}
          <button
            onClick={handleSave}
            disabled={!value || !selectedCat || !desc.trim()}
            style={{
              width: "100%", padding: "15px",
              background: saved ? "#333" : (!value || !selectedCat) ? "#e0e0e0" : "#000",
              color: (!value || !selectedCat) ? "#aaa" : "#fff",
              fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em",
              borderRadius: "4px", border: "none",
              cursor: (!value || !selectedCat) ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {saved ? "✓ REGISTRADO" : "REGISTRAR TRANSAÇÃO"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em",
        color: "#bbb", marginBottom: "8px",
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}
