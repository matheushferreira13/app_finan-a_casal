import { useState, type FormEvent } from "react";
import { supabase } from "../supabase";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

      try {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (result.error) {
          setMessage("Credenciais inválidas ou acesso indisponível.");
        }
      } catch {
        setMessage("Credenciais inválidas ou acesso indisponível.");
      } finally {
        setLoading(false);
      }
  }

  return (
    <main className="login-screen flex min-h-screen items-center justify-center bg-[#11100e] p-5 text-zinc-950">
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm overflow-hidden bg-[#f8f7f4] p-7 shadow-2xl sm:p-9">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#c49a54]" />
        <div className="flex flex-col items-center text-center">
          <div className="diamond-wordmark" aria-label="Diamond">Diamond</div>
          <p className="mt-2 text-xs text-zinc-500">Um espaço privado para Matheus e Luana</p>
        </div>

        <label className="mt-8 block text-[10px] font-bold tracking-[0.14em] text-zinc-500">E-MAIL
        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full border border-zinc-300 p-3 outline-none focus:border-black"
        />
        </label>
        <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-500">SENHA
        <input
          type="password"
          required
          minLength={6}
          placeholder="Senha (mínimo 6 caracteres)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border border-zinc-300 p-3 outline-none focus:border-black"
        />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black p-3 text-xs font-bold tracking-[0.14em] text-white disabled:opacity-50"
        >
          {loading ? "Aguarde..." : "Entrar"}
        </button>

        {message && <p className="text-sm text-zinc-600">{message}</p>}
      </form>
    </main>
  );
}
