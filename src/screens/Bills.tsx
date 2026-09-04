import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export type Bill = {
  id: string;
  label: string;
  value: number;
  dueDay: number;
  category: string;
  who: string;
  paid: boolean;
  recurring: boolean;
};

const CATEGORIES = ["Moradia", "Energia", "Água", "Internet", "Transporte", "Saúde", "Educação", "Assinatura", "Outros"];
const PEOPLE = ["Matheus", "Luana", "Ambos"];

const initialBills: Bill[] = [];

type Modal = { type: "new" } | { type: "edit"; bill: Bill } | null;

export default function Bills({ householdId }: { householdId: string }) {
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [modal, setModal] = useState<Modal>(null);
  const [filter, setFilter] = useState<"todas" | "pendentes" | "pagas">("todas");
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      const periodStart = new Date();
      periodStart.setDate(1);
      const period = periodStart.toISOString().slice(0, 10);
      const [billsResult, paymentsResult] = await Promise.all([
        supabase.from("recurring_bills").select("id,name,amount,due_day,is_active,frequency,category:categories(name)").eq("household_id", householdId).eq("is_active", true).order("due_day"),
        supabase.from("bill_payments").select("recurring_bill_id").eq("household_id", householdId).eq("period_start", period),
      ]);
      if (billsResult.error || paymentsResult.error) {
        setErrorMessage(paymentsResult.error?.message ?? billsResult.error?.message ?? "Não foi possível carregar as contas.");
        return;
      }
      const paidIds = new Set((paymentsResult.data ?? []).map((payment) => payment.recurring_bill_id));
      setBills((billsResult.data ?? []).map((bill) => ({ id: bill.id, label: bill.name, value: Number(bill.amount), dueDay: bill.due_day ?? 1, category: bill.category?.[0]?.name ?? "Outros", who: "Ambos", paid: paidIds.has(bill.id), recurring: bill.frequency !== "yearly" })));
    }
    void load();
    const channel = supabase.channel(`bill-payments-${householdId}`).on("postgres_changes", { event: "*", schema: "public", table: "bill_payments", filter: `household_id=eq.${householdId}` }, load).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [householdId, refreshKey]);

  async function togglePaid(id: string) {
    if (savingId) return;
    setSavingId(id);
    setErrorMessage("");
    const result = await supabase.rpc("toggle_bill_payment", { p_bill_id: id });
    if (result.error) setErrorMessage(result.error.message);
    else setRefreshKey((value) => value + 1);
    setSavingId(null);
  }

  async function deleteBill(id: string) {
    await supabase.from("recurring_bills").delete().eq("id", id).eq("household_id", householdId);
    setBills(bills.filter((b) => b.id !== id));
  }

  async function saveBill(data: Omit<Bill, "id">) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const category = await supabase.from("categories").upsert({ household_id: householdId, name: data.category, kind: "expense" }, { onConflict: "household_id,name,kind" }).select("id").single();
    if (category.error) return;
    if (modal?.type === "edit") {
      void supabase.from("recurring_bills").update({ name: data.label, amount: data.value, due_day: data.dueDay, category_id: category.data.id, frequency: data.recurring ? "monthly" : "yearly" }).eq("id", modal.bill.id).eq("household_id", householdId);
      setBills(bills.map((b) => (b.id === modal.bill.id ? { ...b, ...data } : b)));
    } else {
      const result = await supabase.from("recurring_bills").insert({ household_id: householdId, created_by: user.id, name: data.label, amount: data.value, due_day: data.dueDay, category_id: category.data.id, is_active: true, frequency: data.recurring ? "monthly" : "yearly" }).select("id").single();
      if (result.data) setBills([...bills, { ...data, id: result.data.id }]);
    }
    setModal(null);
  }

  const filtered = bills.filter((b) =>
    filter === "todas" ? true : filter === "pendentes" ? !b.paid : b.paid
  );

  const totalMonth = bills.reduce((s, b) => s + b.value, 0);
  const totalPaid = bills.filter((b) => b.paid).reduce((s, b) => s + b.value, 0);
  const totalPending = bills.filter((b) => !b.paid).reduce((s, b) => s + b.value, 0);

  const today = 31;
  const upcoming = bills
    .filter((b) => !b.paid && b.dueDay >= today)
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 2);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden min-h-0">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background: "#000", padding: "52px 24px 20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#666", marginBottom: "4px" }}>
          {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date()).toUpperCase()}
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>Contas Fixas</h1>
          <button
            onClick={() => setModal({ type: "new" })}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "7px 12px", borderRadius: "3px",
              background: "#fff", border: "none", cursor: "pointer",
              fontSize: "11px", fontWeight: 700, color: "#000", letterSpacing: "0.06em",
            }}
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> NOVA CONTA
          </button>
        </div>

        {/* Summary pills */}
        <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
          <SummaryPill label="TOTAL" value={totalMonth} light />
          <SummaryPill label="PAGO" value={totalPaid} />
          <SummaryPill label="PENDENTE" value={totalPending} />
        </div>
      </div>

      {/* ── PRÓXIMOS VENCIMENTOS ────────────────────────── */}
      {upcoming.length > 0 && (
        <div style={{ padding: "14px 16px 0" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#aaa", marginBottom: "8px" }}>
            VENCENDO EM BREVE
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {upcoming.map((b) => (
              <div key={b.id} style={{
                flex: 1, padding: "10px 12px",
                border: "1px solid #e0e0e0", borderRadius: "4px",
                background: "#fafafa",
              }}>
                <p style={{ fontSize: "11px", color: "#aaa", letterSpacing: "0.04em" }}>DIA {b.dueDay}</p>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#000", marginTop: "2px" }}>{b.label}</p>
                <p style={{ fontSize: "12px", color: "#555", marginTop: "1px" }}>
                  {b.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && <p style={{ padding: "10px 16px 0", fontSize: "11px", color: "#888" }}>{errorMessage}</p>}

      {/* ── FILTER TABS ────────────────────────────────── */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: "6px" }}>
        {(["todas", "pendentes", "pagas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px", border: "1px solid",
              borderColor: filter === f ? "#000" : "#ddd",
              background: filter === f ? "#000" : "#fff",
              color: filter === f ? "#fff" : "#888",
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
              borderRadius: "2px", cursor: "pointer", textTransform: "uppercase" as const,
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── BILL LIST ──────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: "13px", color: "#ccc", textAlign: "center", marginTop: "40px" }}>
            Nenhuma conta aqui.
          </p>
        )}
        {filtered
          .sort((a, b) => a.dueDay - b.dueDay)
          .map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              onToggle={() => void togglePaid(bill.id)}
              onEdit={() => setModal({ type: "edit", bill })}
              onDelete={() => deleteBill(bill.id)}
            />
          ))}
        <div style={{ height: "8px" }} />
      </div>

      {/* ── MODAL ──────────────────────────────────────── */}
      {modal && (
        <BillModal
          bill={modal.type === "edit" ? modal.bill : undefined}
          onSave={saveBill}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ── BILL CARD ─────────────────────────────────────────── */
function BillCard({ bill, onToggle, onEdit, onDelete }: {
  bill: Bill;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{
      border: "1px solid",
      borderColor: bill.paid ? "#ebebeb" : "#e0e0e0",
      borderRadius: "6px", background: bill.paid ? "#fafafa" : "#fff",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 14px" }}>

        {/* Checkbox */}
        <button
          onClick={onToggle}
          style={{
            width: "22px", height: "22px", borderRadius: "4px", flexShrink: 0,
            border: "1.5px solid", borderColor: bill.paid ? "#000" : "#ccc",
            background: bill.paid ? "#000" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {bill.paid && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
        </button>

        {/* Due day badge */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "4px", flexShrink: 0,
          background: bill.paid ? "#f0f0f0" : "#000",
          display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "8px", color: bill.paid ? "#aaa" : "#888", letterSpacing: "0.04em", lineHeight: 1 }}>DIA</span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: bill.paid ? "#bbb" : "#fff", lineHeight: 1.1 }}>
            {bill.dueDay}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "13px", fontWeight: 600,
            color: bill.paid ? "#aaa" : "#000",
            textDecoration: bill.paid ? "line-through" : "none",
          }}>
            {bill.label}
          </p>
          <p style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>
            {bill.category} · {bill.who} {bill.recurring ? "· Recorrente" : "· Único"}
          </p>
        </div>

        {/* Value */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{
            fontSize: "15px", fontWeight: 700, letterSpacing: "-0.02em",
            color: bill.paid ? "#bbb" : "#000",
          }}>
            {bill.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", borderTop: "1px solid #f5f5f5" }}>
        <ActionBtn label={bill.paid ? "DESFAZER" : "MARCAR PAGO"} onClick={onToggle} primary={!bill.paid} />
        <div style={{ width: "1px", background: "#f5f5f5" }} />
        <ActionBtn label="EDITAR" onClick={onEdit} />
        <div style={{ width: "1px", background: "#f5f5f5" }} />
        <ActionBtn label="EXCLUIR" onClick={onDelete} />
      </div>
    </div>
  );
}

/* ── BILL MODAL ────────────────────────────────────────── */
function BillModal({ bill, onSave, onClose }: {
  bill?: Bill;
  onSave: (data: Omit<Bill, "id">) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(bill?.label ?? "");
  const [value, setValue] = useState(bill ? String(bill.value) : "");
  const [dueDay, setDueDay] = useState(bill ? String(bill.dueDay) : "");
  const [category, setCategory] = useState(bill?.category ?? "Moradia");
  const [who, setWho] = useState(bill?.who ?? "Ambos");
  const [recurring, setRecurring] = useState(bill?.recurring ?? true);
  const [error, setError] = useState("");

  function confirm() {
    if (!label.trim()) { setError("Informe o nome da conta."); return; }
    const v = parseFloat(value.replace(",", "."));
    if (!v || v <= 0) { setError("Informe um valor válido."); return; }
    const d = parseInt(dueDay);
    if (!d || d < 1 || d > 31) { setError("Dia de vencimento inválido (1–31)."); return; }
    onSave({ label: label.trim(), value: v, dueDay: d, category, who, paid: bill?.paid ?? false, recurring });
  }

  return (
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "10px 10px 0 0", width: "100%", maxHeight: "90%", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
          <div style={{ width: "40px", height: "4px", background: "#ddd", borderRadius: "2px" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 16px", borderBottom: "1px solid #ebebeb" }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#aaa" }}>
              {bill ? "EDITAR CONTA" : "NOVA CONTA FIXA"}
            </p>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#000", marginTop: "2px" }}>
              {bill ? bill.label : "Cadastrar obrigação"}
            </h3>
          </div>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#f0f0f0", border: "none", cursor: "pointer", fontSize: "18px", color: "#666", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", scrollbarWidth: "none" as const, padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Nome */}
          <div>
            <FL>NOME DA CONTA</FL>
            <input
              type="text" placeholder="Ex: Aluguel, Água, Netflix..."
              value={label} onChange={(e) => { setLabel(e.target.value); setError(""); }}
              style={inputStyle}
            />
          </div>

          {/* Valor + Dia */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <FL>VALOR (R$)</FL>
              <input
                type="number" inputMode="decimal" placeholder="0,00"
                value={value} onChange={(e) => { setValue(e.target.value); setError(""); }}
                style={{ ...inputStyle, fontSize: "18px", fontWeight: 700 }}
              />
            </div>
            <div>
              <FL>DIA DO VENCIMENTO</FL>
              <input
                type="number" inputMode="numeric" placeholder="1 – 31"
                value={dueDay} onChange={(e) => { setDueDay(e.target.value); setError(""); }}
                style={{ ...inputStyle, fontSize: "18px", fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <FL>CATEGORIA</FL>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginTop: "8px" }}>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} style={{
                  padding: "6px 12px", border: "1px solid",
                  borderColor: category === c ? "#000" : "#ddd",
                  background: category === c ? "#000" : "#fafafa",
                  color: category === c ? "#fff" : "#555",
                  fontSize: "11px", fontWeight: category === c ? 700 : 400,
                  borderRadius: "3px", cursor: "pointer", transition: "all 0.15s",
                }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Responsável */}
          <div>
            <FL>RESPONSÁVEL</FL>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {PEOPLE.map((p) => (
                <button key={p} onClick={() => setWho(p)} style={{
                  flex: 1, padding: "9px 8px", border: "1px solid",
                  borderColor: who === p ? "#000" : "#ddd",
                  background: who === p ? "#000" : "#fafafa",
                  color: who === p ? "#fff" : "#555",
                  fontSize: "12px", fontWeight: who === p ? 700 : 400,
                  borderRadius: "3px", cursor: "pointer", transition: "all 0.15s",
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Recorrente toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #ebebeb", borderRadius: "4px" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>Conta recorrente</p>
              <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>Repete todo mês automaticamente</p>
            </div>
            <Toggle on={recurring} onChange={setRecurring} />
          </div>

          {error && <p style={{ fontSize: "11px", color: "#888" }}>{error}</p>}

          <button onClick={confirm} style={{
            width: "100%", padding: "14px",
            background: "#000", color: "#fff",
            fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em",
            borderRadius: "4px", border: "none", cursor: "pointer",
          }}>
            {bill ? "SALVAR ALTERAÇÕES" : "CADASTRAR CONTA"}
          </button>

          <div style={{ height: "4px" }} />
        </div>
      </div>
    </div>
  );
}

/* ── PRIMITIVES ────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  marginTop: "8px", padding: "10px 12px",
  fontSize: "14px", color: "#000",
  background: "#fafafa", border: "1px solid #ddd",
  borderRadius: "4px", outline: "none",
};

function FL({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#bbb" }}>{children}</p>
  );
}

function ActionBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "10px 4px",
      background: primary ? "#000" : "#fff",
      color: primary ? "#fff" : "#888",
      fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
      border: "none", cursor: "pointer", transition: "opacity 0.15s",
    }}>
      {label}
    </button>
  );
}

function SummaryPill({ label, value, light }: { label: string; value: number; light?: boolean }) {
  return (
    <div style={{
      flex: 1, padding: "8px 10px",
      background: light ? "#111" : "#1a1a1a",
      border: "1px solid #2a2a2a", borderRadius: "4px",
    }}>
      <p style={{ fontSize: "8px", color: "#555", letterSpacing: "0.12em", marginBottom: "3px" }}>{label}</p>
      <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
        {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: "40px", height: "22px", borderRadius: "11px",
      background: on ? "#000" : "#ddd", border: "none", cursor: "pointer",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
        position: "absolute", top: "3px", left: on ? "21px" : "3px",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}
