import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Goal = {
  id: string;
  label: string;
  target: number;
  current: number;
  deadline: string;
  history: { type: "deposit" | "withdraw"; value: number; date: string; who: string }[];
};

type Modal =
  | { type: "deposit" | "withdraw"; goalId: string }
  | { type: "edit"; goalId: string }
  | { type: "new" }
  | null;

const NOW = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date());

export default function Goals({ householdId }: { householdId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("goals").select("id,name,target_amount,current_amount,target_date").eq("household_id", householdId).order("created_at");
      setGoals((data ?? []).map((goal) => ({ id: goal.id, label: goal.name, target: Number(goal.target_amount), current: Number(goal.current_amount), deadline: goal.target_date ?? "Sem prazo", history: [] })));
    }
    void load();
  }, [householdId]);

  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  async function updateGoal(id: string, patch: Partial<Goal>) {
    const databasePatch = { ...(patch.label === undefined ? {} : { name: patch.label }), ...(patch.target === undefined ? {} : { target_amount: patch.target }), ...(patch.current === undefined ? {} : { current_amount: patch.current }), ...(patch.deadline === undefined ? {} : { target_date: patch.deadline }) };
    await supabase.from("goals").update(databasePatch).eq("id", id).eq("household_id", householdId);
    setGoals(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  async function deleteGoal(id: string) {
    await supabase.from("goals").delete().eq("id", id).eq("household_id", householdId);
    setGoals(goals.filter((g) => g.id !== id));
  }

  async function addGoal(label: string, target: number, deadline: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.from("goals").insert({ household_id: householdId, created_by: user.id, name: label, target_amount: target, target_date: deadline || null }).select("id").single();
    if (data) setGoals([...goals, { id: data.id, label, target, current: 0, deadline, history: [] }]);
  }

  return (
    <div className="h-full flex flex-col bg-white" style={{ position: "relative" }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background: "#000", padding: "52px 24px 24px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#666", marginBottom: "4px" }}>
          METAS & CAIXINHAS
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>Planejamento</h1>

        {/* Total overview */}
        <div style={{
          display: "flex", gap: "8px", marginTop: "18px",
        }}>
          <div style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "12px" }}>
            <p style={{ fontSize: "9px", color: "#555", letterSpacing: "0.12em", marginBottom: "4px" }}>TOTAL GUARDADO</p>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              {totalSaved.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "12px" }}>
            <p style={{ fontSize: "9px", color: "#555", letterSpacing: "0.12em", marginBottom: "4px" }}>TOTAL EM METAS</p>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              {totalTarget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>
      </div>

      {/* ── GOAL LIST ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {goals.map((g) => {
          const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
          const remaining = g.target - g.current;
          return (
            <GoalCard
              key={g.id}
              goal={g}
              pct={pct}
              remaining={remaining}
              onDeposit={() => setModal({ type: "deposit", goalId: g.id })}
              onWithdraw={() => setModal({ type: "withdraw", goalId: g.id })}
              onEdit={() => setModal({ type: "edit", goalId: g.id })}
              onDelete={() => deleteGoal(g.id)}
            />
          );
        })}

        {/* Add new goal button */}
        <button
          onClick={() => setModal({ type: "new" })}
          style={{
            width: "100%", padding: "14px",
            border: "1px dashed #ccc", borderRadius: "6px",
            background: "transparent", color: "#aaa",
            fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> NOVA META
        </button>

        <div style={{ height: "8px" }} />
      </div>

      {/* ── MODALS ─────────────────────────────────────── */}
      {modal?.type === "deposit" && (
        <TransactionModal
          title="Depositar na Caixinha"
          actionLabel="DEPOSITAR"
          goalName={goals.find((g) => g.id === modal.goalId)?.label ?? ""}
          onConfirm={(val, who) => {
            const g = goals.find((g) => g.id === modal.goalId)!;
            void supabase.from("goals").update({ current_amount: g.current + val }).eq("id", modal.goalId).eq("household_id", householdId);
            updateGoal(modal.goalId, {
              current: g.current + val,
              history: [{ type: "deposit", value: val, date: NOW, who }, ...g.history],
            });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "withdraw" && (
        <TransactionModal
          title="Retirar da Caixinha"
          actionLabel="RETIRAR"
          goalName={goals.find((g) => g.id === modal.goalId)?.label ?? ""}
          maxValue={goals.find((g) => g.id === modal.goalId)?.current}
          onConfirm={(val, who) => {
            const g = goals.find((g) => g.id === modal.goalId)!;
            void supabase.from("goals").update({ current_amount: Math.max(g.current - val, 0) }).eq("id", modal.goalId).eq("household_id", householdId);
            updateGoal(modal.goalId, {
              current: Math.max(g.current - val, 0),
              history: [{ type: "withdraw", value: val, date: NOW, who }, ...g.history],
            });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "edit" && (
        <EditGoalModal
          goal={goals.find((g) => g.id === modal.goalId)!}
          onConfirm={(label, target, deadline) => {
            updateGoal(modal.goalId, { label, target, deadline });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "new" && (
        <EditGoalModal
          onConfirm={(label, target, deadline) => {
            addGoal(label, target, deadline);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ── GOAL CARD ─────────────────────────────────────────── */
function GoalCard({
  goal, pct, remaining,
  onDeposit, onWithdraw, onEdit, onDelete,
}: {
  goal: Goal; pct: number; remaining: number;
  onDeposit: () => void; onWithdraw: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", overflow: "hidden", background: "#fff" }}>
      {/* Top row */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#000" }}>{goal.label}</p>
            <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>Prazo: {goal.deadline}</p>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <IconBtn label="Editar" onClick={onEdit}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9.5 2L12 4.5 5 11.5H2.5V9L9.5 2z" />
              </svg>
            </IconBtn>
            <IconBtn label="Excluir" onClick={onDelete} danger>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.7 8h6.6l.7-8" />
              </svg>
            </IconBtn>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
          <div style={{
            width: `${pct}%`, height: "100%", background: pct >= 100 ? "#333" : "#000",
            borderRadius: "3px", transition: "width 0.5s ease",
          }} />
        </div>

        {/* Values row */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <div>
            <p style={{ fontSize: "9px", color: "#bbb", letterSpacing: "0.1em" }}>GUARDADO</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#000", letterSpacing: "-0.02em" }}>
              {goal.current.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "9px", color: "#bbb", letterSpacing: "0.1em" }}>PROGRESSO</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#000" }}>{pct}%</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "9px", color: "#bbb", letterSpacing: "0.1em" }}>FALTAM</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#555", letterSpacing: "-0.02em" }}>
              {remaining > 0
                ? remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : "Meta atingida!"}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", borderTop: "1px solid #f0f0f0" }}>
        <ActionBtn label="+ DEPOSITAR" onClick={onDeposit} primary />
        <div style={{ width: "1px", background: "#f0f0f0" }} />
        <ActionBtn label="– RETIRAR" onClick={onWithdraw} />
        <div style={{ width: "1px", background: "#f0f0f0" }} />
        <ActionBtn label={expanded ? "▲ HISTÓRICO" : "▼ HISTÓRICO"} onClick={() => setExpanded(!expanded)} />
      </div>

      {/* History */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
          {goal.history.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#bbb", padding: "12px 16px", textAlign: "center" }}>
              Nenhuma movimentação ainda.
            </p>
          ) : (
            goal.history.slice(0, 6).map((h, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px",
                borderTop: i > 0 ? "1px solid #efefef" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: h.type === "deposit" ? "#000" : "#ccc",
                    flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "#333" }}>
                      {h.type === "deposit" ? "Depósito" : "Retirada"} · {h.who}
                    </p>
                    <p style={{ fontSize: "10px", color: "#aaa" }}>{h.date}</p>
                  </div>
                </div>
                <p style={{
                  fontSize: "13px", fontWeight: 700,
                  color: h.type === "deposit" ? "#000" : "#888",
                  letterSpacing: "-0.01em",
                }}>
                  {h.type === "deposit" ? "+" : "–"}
                  {h.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── DEPOSIT / WITHDRAW MODAL ──────────────────────────── */
function TransactionModal({
  title, actionLabel, goalName, maxValue, onConfirm, onClose,
}: {
  title: string; actionLabel: string; goalName: string;
  maxValue?: number;
  onConfirm: (val: number, who: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState("");
  const [who, setWho] = useState("Matheus");
  const [error, setError] = useState("");

  function confirm() {
    const n = parseFloat(val.replace(",", "."));
    if (!n || n <= 0) { setError("Informe um valor válido."); return; }
    if (maxValue !== undefined && n > maxValue) { setError("Valor maior que o saldo disponível."); return; }
    onConfirm(n, who);
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "20px" }}>
        Meta: <strong style={{ color: "#000" }}>{goalName}</strong>
      </p>

      <FieldLabel>QUEM ESTÁ MOVIMENTANDO</FieldLabel>
      <div style={{ display: "flex", gap: "8px", marginTop: "8px", marginBottom: "20px" }}>
        {["Matheus", "Luana"].map((p) => (
          <button key={p} onClick={() => setWho(p)} style={{
            flex: 1, padding: "10px",
            border: "1px solid", borderRadius: "4px",
            borderColor: who === p ? "#000" : "#ddd",
            background: who === p ? "#000" : "#fafafa",
            color: who === p ? "#fff" : "#555",
            fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
          }}>{p}</button>
        ))}
      </div>

      <FieldLabel>VALOR (R$)</FieldLabel>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        border: "1px solid #000", borderRadius: "4px", padding: "10px 14px",
        marginTop: "8px", marginBottom: error ? "6px" : "20px",
      }}>
        <span style={{ fontSize: "20px", fontWeight: 300, color: "#bbb" }}>R$</span>
        <input
          type="number" inputMode="decimal" placeholder="0,00"
          value={val} onChange={(e) => { setVal(e.target.value); setError(""); }}
          autoFocus
          style={{
            flex: 1, fontSize: "26px", fontWeight: 700, color: "#000",
            background: "transparent", border: "none", outline: "none", letterSpacing: "-0.02em",
          }}
        />
      </div>
      {maxValue !== undefined && (
        <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "16px" }}>
          Disponível para retirada: {maxValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      )}
      {error && <p style={{ fontSize: "11px", color: "#888", marginBottom: "16px" }}>{error}</p>}

      <button onClick={confirm} style={{
        width: "100%", padding: "14px",
        background: "#000", color: "#fff",
        fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em",
        borderRadius: "4px", border: "none", cursor: "pointer",
      }}>
        {actionLabel}
      </button>
    </BottomSheet>
  );
}

/* ── EDIT / NEW GOAL MODAL ─────────────────────────────── */
function EditGoalModal({
  goal, onConfirm, onClose,
}: {
  goal?: Goal;
  onConfirm: (label: string, target: number, deadline: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(goal?.label ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [error, setError] = useState("");

  function confirm() {
    if (!label.trim()) { setError("Dê um nome à meta."); return; }
    const t = parseFloat(target.replace(",", "."));
    if (!t || t <= 0) { setError("Informe o valor alvo."); return; }
    if (!deadline.trim()) { setError("Informe o prazo."); return; }
    onConfirm(label.trim(), t, deadline.trim());
  }

  return (
    <BottomSheet title={goal ? "Editar Meta" : "Nova Meta"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <FieldLabel>NOME DA META</FieldLabel>
          <input
            type="text" placeholder="Ex: Viagem para a Europa"
            value={label} onChange={(e) => { setLabel(e.target.value); setError(""); }}
            style={{
              width: "100%", boxSizing: "border-box" as const, marginTop: "8px",
              padding: "11px 14px", fontSize: "14px", color: "#000",
              background: "#fafafa", border: "1px solid #ddd", borderRadius: "4px", outline: "none",
            }}
          />
        </div>

        <div>
          <FieldLabel>VALOR ALVO (R$)</FieldLabel>
          <input
            type="number" inputMode="decimal" placeholder="0,00"
            value={target} onChange={(e) => { setTarget(e.target.value); setError(""); }}
            style={{
              width: "100%", boxSizing: "border-box" as const, marginTop: "8px",
              padding: "11px 14px", fontSize: "18px", fontWeight: 700, color: "#000",
              background: "#fafafa", border: "1px solid #ddd", borderRadius: "4px", outline: "none",
              letterSpacing: "-0.02em",
            }}
          />
        </div>

        <div>
          <FieldLabel>PRAZO</FieldLabel>
          <input
            type="text" placeholder="Ex: Dez 2027"
            value={deadline} onChange={(e) => { setDeadline(e.target.value); setError(""); }}
            style={{
              width: "100%", boxSizing: "border-box" as const, marginTop: "8px",
              padding: "11px 14px", fontSize: "14px", color: "#000",
              background: "#fafafa", border: "1px solid #ddd", borderRadius: "4px", outline: "none",
            }}
          />
        </div>

        {error && <p style={{ fontSize: "11px", color: "#888" }}>{error}</p>}

        <button onClick={confirm} style={{
          width: "100%", padding: "14px",
          background: "#000", color: "#fff",
          fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em",
          borderRadius: "4px", border: "none", cursor: "pointer",
        }}>
          {goal ? "SALVAR ALTERAÇÕES" : "CRIAR META"}
        </button>
      </div>
    </BottomSheet>
  );
}

/* ── PRIMITIVES ────────────────────────────────────────── */
function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "10px 10px 0 0", width: "100%", maxHeight: "85%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
          <div style={{ width: "40px", height: "4px", background: "#ddd", borderRadius: "2px" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 16px", borderBottom: "1px solid #ebebeb" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#000" }}>{title}</h3>
          <button onClick={onClose} style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#f0f0f0", border: "none", cursor: "pointer", fontSize: "18px", color: "#666", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "20px", overflowY: "auto", scrollbarWidth: "none" as const }}>{children}</div>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "11px 6px",
      background: primary ? "#000" : "#fff",
      color: primary ? "#fff" : "#555",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
      border: "none", cursor: "pointer",
      transition: "opacity 0.15s",
    }}>
      {label}
    </button>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: "28px", height: "28px", borderRadius: "3px",
        border: "1px solid", borderColor: danger ? "#e0e0e0" : "#e0e0e0",
        background: "#fafafa", color: danger ? "#aaa" : "#666",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#bbb" }}>{children}</p>
  );
}
