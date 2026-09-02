import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "../supabase";

type Person = {
  id: string;
  name: string;
  initial: string;
  role: string;
  income: number;
  color: string;
  avatar_url?: string | null;
};

const notificationLabels = [
  { id: "goals", label: "Lembrete de metas mensais" },
  { id: "high_spend", label: "Alerta de gasto alto" },
  { id: "weekly_summary", label: "Resumo semanal" },
];

export default function Profile({ householdId, userId, onSignOut }: { householdId: string; userId: string; onSignOut: () => Promise<{ error: unknown }> }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [notifs, setNotifs] = useState<Record<string, boolean>>({ goals: true, high_spend: true, weekly_summary: false });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("profiles").select("id,name,role,income,avatar_url,notifications").eq("household_id", householdId).order("updated_at");
      const profiles = data ?? [];
      setPeople(profiles.map((person, index) => ({ ...person, income: Number(person.income), initial: person.name.slice(0, 1).toUpperCase(), color: index === 0 ? "#000" : "#444" })));
      const current = profiles.find((person) => person.id === userId);
      if (current?.notifications) setNotifs(current.notifications as Record<string, boolean>);
      if (!current) {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) await supabase.from("profiles").upsert({ id: user.id, household_id: householdId, name: user.email?.split("@")[0] ?? "Usuário" });
      }
    }
    void load();
  }, [householdId, userId]);

  async function savePerson(index: number, patch: Partial<Person>) {
    const person = people[index];
    await supabase.from("profiles").update({ name: patch.name, role: patch.role, income: patch.income }).eq("id", person.id).eq("household_id", householdId);
    setPeople(people.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    setEditing(null);
  }

  const totalIncome = people.reduce((s, p) => s + Number(p.income), 0);

  async function changeNotifications(id: string, value: boolean) {
    const next = { ...notifs, [id]: value };
    setNotifs(next);
    await supabase.from("profiles").update({ notifications: next }).eq("id", userId);
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${extension}`;
    const upload = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upload.error) return;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").upsert({ id: userId, household_id: householdId, avatar_url: data.publicUrl });
    setPeople(people.map((person) => person.id === userId ? { ...person, avatar_url: data.publicUrl } : person));
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = data.publicUrl;
  }

  return (
    <div className="h-full overflow-y-auto bg-white" style={{ scrollbarWidth: "none" }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ background: "#000", padding: "52px 24px 24px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", color: "#666", marginBottom: "4px" }}>
          CONFIGURAÇÕES
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>Perfil do Casal</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" }}>
          <div style={{ display: "flex" }}>
              {people.map((p, i) => (
              <div key={i} style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: p.color, border: "2px solid #000",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "15px", fontWeight: 700,
                marginLeft: i > 0 ? "-10px" : 0,
              }}>
                {p.avatar_url ? <img src={p.avatar_url} alt={p.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : p.initial}
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
              {people.map((p) => p.name.split(" ")[0]).join(" & ")}
            </p>
            <p style={{ fontSize: "11px", color: "#555" }}>
              Renda conjunta: {totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>
        <label style={{ display: "inline-block", marginTop: "12px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", cursor: "pointer" }}>
          TROCAR FOTO
          <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
        </label>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* ── PESSOAS ────────────────────────────────────── */}
        <SectionLabel>MEMBROS</SectionLabel>
        <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", overflow: "hidden" }}>
          {people.map((p, i) => (
            <div key={i}>
              {editing === i ? (
                <EditPersonForm
                  person={p}
                  onSave={(patch) => savePerson(i, patch)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "14px 16px",
                  borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
                  background: "#fff",
                }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: p.color, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "14px", fontWeight: 700,
                  }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt={p.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : p.initial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#000" }}>{p.name}</p>
                    <p style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                      {p.role} · {p.income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(i)}
                    style={{
                      padding: "6px 12px", border: "1px solid #e0e0e0",
                      borderRadius: "3px", background: "#fafafa",
                      fontSize: "11px", fontWeight: 600, color: "#555",
                      cursor: "pointer", letterSpacing: "0.04em",
                    }}
                  >
                    EDITAR
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── RENDA COMBINADA ────────────────────────────── */}
        <SectionLabel>DISTRIBUIÇÃO DE RENDA</SectionLabel>
        <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", padding: "16px", background: "#fff" }}>
          {people.map((p, i) => {
            const pct = Math.round((p.income / totalIncome) * 100);
            return (
              <div key={i} style={{ marginBottom: i < people.length - 1 ? "14px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#000" }}>
                    {p.name.split(" ")[0]}
                  </span>
                  <span style={{ fontSize: "12px", color: "#555" }}>
                    {pct}% · {p.income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div style={{ height: "5px", background: "#f0f0f0", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: p.color, borderRadius: "3px",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── NOTIFICAÇÕES ───────────────────────────────── */}
        <SectionLabel>NOTIFICAÇÕES</SectionLabel>
        <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", overflow: "hidden" }}>
          {notificationLabels.map((n, i) => (
            <div key={n.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px",
              borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
              background: "#fff",
            }}>
              <p style={{ fontSize: "13px", color: "#000", fontWeight: 400 }}>{n.label}</p>
              <Toggle
                on={notifs[n.id] ?? false}
                onChange={(v) => void changeNotifications(n.id, v)}
              />
            </div>
          ))}
        </div>

        {/* ── SOBRE O APP ────────────────────────────────── */}
        <SectionLabel>SOBRE</SectionLabel>
        <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", overflow: "hidden" }}>
          {[
            { label: "Versão", value: "1.0.0" },
            { label: "Plano", value: "Gratuito" },
            { label: "Dados sincronizados", value: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date()) },
          ].map((row, i) => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "13px 16px",
              borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
            }}>
              <p style={{ fontSize: "13px", color: "#444" }}>{row.label}</p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>{row.value}</p>
            </div>
          ))}
        </div>

        {/* ── SAIR ───────────────────────────────────────── */}
        <button onClick={() => void onSignOut()} style={{
          width: "100%", padding: "14px",
          border: "1px solid #e0e0e0", borderRadius: "4px",
          background: "#fafafa", color: "#aaa",
          fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em",
          cursor: "pointer", marginTop: "4px",
        }}>
          SAIR DA CONTA
        </button>

        <div style={{ height: "8px" }} />
      </div>
    </div>
  );
}

/* ── EDIT PERSON FORM ──────────────────────────────────── */
function EditPersonForm({
  person, onSave, onCancel,
}: {
  person: Person;
  onSave: (patch: Partial<Person>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(person.name);
  const [role, setRole] = useState(person.role);
  const [income, setIncome] = useState(String(person.income));

  return (
    <div style={{ padding: "16px", background: "#fafafa", borderTop: "1px solid #f0f0f0" }}>
      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "#bbb", marginBottom: "12px" }}>
        EDITANDO PERFIL
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Field label="NOME" value={name} onChange={setName} placeholder="Nome completo" />
        <Field label="PROFISSÃO" value={role} onChange={setRole} placeholder="Ex: Designer" />
        <Field label="RENDA MENSAL (R$)" value={income} onChange={setIncome} placeholder="0,00" type="number" />
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "10px",
          border: "1px solid #ddd", borderRadius: "3px",
          background: "#fff", color: "#888",
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer",
        }}>
          CANCELAR
        </button>
        <button
          onClick={() => onSave({ name, role, income: parseFloat(income) || person.income })}
          style={{
            flex: 2, padding: "10px",
            border: "none", borderRadius: "3px",
            background: "#000", color: "#fff",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer",
          }}
        >
          SALVAR
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "#bbb", marginBottom: "5px" }}>
        {label}
      </p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box" as const,
          padding: "9px 12px", fontSize: "13px", color: "#000",
          background: "#fff", border: "1px solid #ddd",
          borderRadius: "3px", outline: "none",
        }}
      />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: "40px", height: "22px", borderRadius: "11px",
        background: on ? "#000" : "#ddd",
        border: "none", cursor: "pointer",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: "16px", height: "16px", borderRadius: "50%",
        background: "#fff", position: "absolute",
        top: "3px", left: on ? "21px" : "3px",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
      color: "#aaa", marginTop: "4px",
    }}>
      {children}
    </p>
  );
}
