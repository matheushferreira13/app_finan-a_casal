import { useState } from "react";
import Dashboard from "./screens/Dashboard";
import Diary from "./screens/Diary";
import AddTransaction from "./screens/AddTransaction";
import Goals from "./screens/Goals";
import Profile from "./screens/Profile";
import Bills from "./screens/Bills";
import AuthForm from "./components/AuthForm";
import { useAuth } from "./hooks/useAuth";
import { useHousehold } from "./hooks/useHousehold";
import WeeklySummaryNotification from "./components/WeeklySummaryNotification";

type Screen = "dashboard" | "diary" | "goals" | "bills" | "profile";

export default function App() {
  const { user, loading, signOut } = useAuth();
  const householdState = useHousehold(user?.id);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [showAdd, setShowAdd] = useState(false);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <AuthForm />;
  }

  if (householdState.loading) {
    return <div className="flex min-h-screen items-center justify-center">Preparando sua casa...</div>;
  }

  if (!householdState.household) {
    return <div className="flex min-h-screen items-center justify-center p-6 text-center">{householdState.error ?? "Não foi possível carregar sua casa."}</div>;
  }

  return (
    <div
      className="app-viewport flex w-full h-full min-h-0"
      style={{ background: "#000", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}
    >
      <div
        className="app-shell relative flex min-h-0 flex-col overflow-hidden"
        style={{
          width: "100vw",
          height: "100dvh",
          maxWidth: "none",
          background: "#fff",
          boxShadow: "none",
        }}
      >
        <WeeklySummaryNotification householdId={householdState.household.id} />
        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={() => void signOut()}
            className="text-[10px] font-bold tracking-[0.12em] text-zinc-400"
          >
            SAIR
          </button>
        </div>

        {/* Screen content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {screen === "dashboard" && <Dashboard householdId={householdState.household.id} />}
          {screen === "diary" && <Diary householdId={householdState.household.id} />}
          {screen === "goals" && <Goals householdId={householdState.household.id} />}
          {screen === "bills" && <Bills householdId={householdState.household.id} />}
          {screen === "profile" && <Profile householdId={householdState.household.id} userId={user.id} />}
        </div>

        {/* Add overlay */}
        {showAdd && <AddTransaction householdId={householdState.household.id} userId={user.id} onClose={() => setShowAdd(false)} />}

        {/* FAB add button */}
        <button
          onClick={() => setShowAdd(true)}
          style={{
            position: "absolute", bottom: "72px", right: "20px",
            width: "48px", height: "48px", borderRadius: "50%",
            background: "#000", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "26px", lineHeight: 1,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            zIndex: 40,
          }}
        >+</button>

        {/* Bottom nav */}
        <nav
          style={{
            height: "72px",
            minHeight: "72px",
            borderTop: "1px solid #e0e0e0",
            background: "#fff",
            display: "flex",
            alignItems: "center",
          }}
        >
          <NavTab label="Início" icon={<IconDash />} active={screen === "dashboard"} onClick={() => setScreen("dashboard")} />
          <NavTab label="Diário" icon={<IconList />} active={screen === "diary"} onClick={() => setScreen("diary")} />
          <NavTab label="Contas" icon={<IconBill />} active={screen === "bills"} onClick={() => setScreen("bills")} />
          <NavTab label="Metas" icon={<IconTarget />} active={screen === "goals"} onClick={() => setScreen("goals")} />
          <NavTab label="Perfil" icon={<IconUser />} active={screen === "profile"} onClick={() => setScreen("profile")} />
        </nav>
      </div>
    </div>
  );
}

function NavTab({
  label, icon, active, onClick,
}: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "4px",
        background: "none", border: "none", cursor: "pointer",
        color: active ? "#000" : "#bbb",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6 }}>{icon}</span>
      <span style={{
        fontSize: "11px", fontWeight: active ? 700 : 400,
        letterSpacing: "0.06em",
        borderBottom: active ? "2px solid #000" : "2px solid transparent",
        paddingBottom: "1px",
      }}>
        {label.toUpperCase()}
      </span>
    </button>
  );
}

function IconDash() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <rect x="2" y="10" width="4" height="8" rx="0.5" />
      <rect x="8" y="6" width="4" height="12" rx="0.5" />
      <rect x="14" y="2" width="4" height="16" rx="0.5" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  );
}

function IconBill() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="2" width="14" height="16" rx="1" />
      <line x1="6" y1="7" x2="14" y2="7" />
      <line x1="6" y1="10" x2="14" y2="10" />
      <line x1="6" y1="13" x2="11" y2="13" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="1" x2="10" y2="3.5" />
      <line x1="10" y1="16.5" x2="10" y2="19" />
      <line x1="1" y1="10" x2="3.5" y2="10" />
      <line x1="16.5" y1="10" x2="19" y2="10" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="10" cy="7" r="3.5" />
      <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    </svg>
  );
}
