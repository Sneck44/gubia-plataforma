"use client";
import { useState } from "react";
type Summary = {
  folio: string;
  branch: string;
  address: string | null;
  starts_at: string;
  timezone: string;
  status: string;
  services: { name: string; preparation: string | null }[];
};
export default function Consultar() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [data, setData] = useState<Summary | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lookup",
          folio: String(f.get("folio")).trim().toUpperCase(),
          management_token: String(f.get("token")).trim(),
        }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setData(body.data);
    } catch (e) {
      setError((e as Error).message || "No fue posible consultar la cita.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-[var(--cream)] p-6">
      <section className="card mx-auto mt-8 max-w-xl p-7">
        <a href="/">← GUBIA</a>
        <h1 className="mt-5 text-3xl font-semibold">Consulta tu cita</h1>
        <p className="my-4 text-slate-600">
          Usa el folio y la clave privada que recibiste al reservar.
        </p>
        <form onSubmit={submit} className="grid gap-5">
          <label>
            Folio
            <input
              required
              name="folio"
              className="mt-1 w-full rounded-xl border p-3"
              autoComplete="off"
              maxLength={20}
            />
          </label>
          <label>
            Clave privada de consulta
            <input
              required
              name="token"
              type="password"
              className="mt-1 w-full rounded-xl border p-3"
              autoComplete="off"
              minLength={64}
              maxLength={64}
            />
          </label>
          <button
            disabled={busy}
            className="rounded-xl bg-[var(--gubia)] p-4 text-white disabled:opacity-50"
          >
            {busy ? "Consultando…" : "Consultar"}
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-5 text-red-700">
            {error}
          </p>
        )}
        {data && (
          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <h2 className="text-xl font-semibold">{data.branch}</h2>
            <p>{data.address}</p>
            <p className="mt-3">
              {new Date(data.starts_at).toLocaleString("es-MX", {
                timeZone: data.timezone,
              })}
            </p>
            <p>
              Estado:{" "}
              {
                (
                  {
                    pending: "Pendiente",
                    confirmed: "Confirmada",
                    attended: "Atendida",
                    cancelled: "Cancelada",
                    no_show: "No asistió",
                    rescheduled: "Reprogramada",
                  } as Record<string, string>
                )[data.status]
              }
            </p>
            {data.services?.map((s) => (
              <div key={s.name} className="mt-4">
                <strong>{s.name}</strong>
                {s.preparation && <p>{s.preparation}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
