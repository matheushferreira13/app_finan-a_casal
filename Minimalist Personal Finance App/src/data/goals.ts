export type Goal = {
  id: number;
  label: string;
  target: number;
  current: number;
  deadline: string;
  history: { type: "deposit" | "withdraw"; value: number; date: string; who: string }[];
};

export const initialGoals: Goal[] = [
  {
    id: 1,
    label: "Reserva de Emergência",
    target: 30000,
    current: 18400,
    deadline: "Dez 2026",
    history: [
      { type: "deposit", value: 2000, date: "Ago 2026", who: "João" },
      { type: "deposit", value: 1500, date: "Jul 2026", who: "Ana" },
    ],
  },
  {
    id: 2,
    label: "Viagem Europa",
    target: 15000,
    current: 6200,
    deadline: "Jul 2027",
    history: [
      { type: "deposit", value: 1200, date: "Ago 2026", who: "Ana" },
      { type: "deposit", value: 800, date: "Jul 2026", who: "João" },
    ],
  },
  {
    id: 3,
    label: "Novo Carro",
    target: 50000,
    current: 9800,
    deadline: "2028",
    history: [
      { type: "deposit", value: 3000, date: "Ago 2026", who: "João" },
      { type: "withdraw", value: 500, date: "Jul 2026", who: "Ana" },
    ],
  },
];
