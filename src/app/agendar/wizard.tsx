"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
type Branch = {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
};
type Service = {
  id: string;
  name: string;
  price: number | null;
  preparation: string | null;
  duration_minutes: number;
};
type Slot = { starts_at: string; ends_at: string; remaining: number };
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}
const input = "w-full rounded-xl border border-slate-300 bg-white p-3";
async function call(body: Record<string, unknown>) {
  const r = await fetch("/api/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "No fue posible continuar.");
  return data.data;
}
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export function Booking({
  branches,
  services,
  links,
  siteKey,
}: {
  branches: Branch[];
  services: Service[];
  links: { branch_id: string; service_id: string }[];
  siteKey: string;
}) {
  const [branch, setBranch] = useState(""),
    [service, setService] = useState(""),
    [date, setDate] = useState(""),
    [slots, setSlots] = useState<Slot[]>([]),
    [slot, setSlot] = useState(""),
    [step, setStep] = useState(1),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [captcha, setCaptcha] = useState(""),
    [scriptReady, setScriptReady] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    folio: string;
    token: string;
  } | null>(null);
  const captchaNode = useRef<HTMLDivElement>(null),
    widget = useRef<string | null>(null),
    request = useRef<{ id: string; token: string } | null>(null);
  const selectedBranch = branches.find((b) => b.id === branch),
    selectedService = services.find((s) => s.id === service);
  useEffect(() => {
    let cancelled = false;
    call({ action: "track", event: "landing_viewed" })
      .then((data) => {
        if (!cancelled) {
          if (branches.some((b) => b.id === data.branch_id)) {
            setBranch(data.branch_id);
            if (links.some((l) => l.branch_id === data.branch_id && l.service_id === data.service_id)) setService(data.service_id);
          }
          setReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (
      step !== 3 ||
      !scriptReady ||
      !siteKey ||
      !captchaNode.current ||
      !window.turnstile
    )
      return;
    widget.current = window.turnstile.render(captchaNode.current, {
      sitekey: siteKey,
      action: "book",
      callback: (v: string) => setCaptcha(v),
      "expired-callback": () => setCaptcha(""),
      "error-callback": () => setCaptcha(""),
    });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [step, scriptReady, siteKey]);
  async function loadSlots() {
    setError("");
    setBusy(true);
    setSlot("");
    try {
      setSlots(
        await call({
          action: "slots",
          branch_id: branch,
          service_id: service,
          date,
        }),
      );
      await call({
        action: "track",
        event: "service_selected",
        branch_id: branch,
        service_id: service,
      });
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function beginDetails() {
    setError("");
    setBusy(true);
    try {
      await call({
        action: "track",
        event: "appointment_started",
        branch_id: branch,
        service_id: service,
      });
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    request.current ??= { id: crypto.randomUUID(), token: randomToken() };
    try {
      const data = await call({
        action: "book",
        captcha,
        payload: {
          branch_id: branch,
          service_id: service,
          starts_at: slot,
          request_id: request.current.id,
          management_token: request.current.token,
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          promo_code: form.get("promo"),
          privacy_accepted: form.get("privacy") === "on",
          marketing_consent: form.get("marketing") === "on",
        },
      });
      setConfirmation({ folio: data.folio, token: request.current.token });
    } catch (e) {
      setError((e as Error).message);
      setCaptcha("");
      if (widget.current) window.turnstile?.reset(widget.current);
    } finally {
      setBusy(false);
    }
  }
  if (confirmation)
    return (
      <section className="card mt-8 p-7">
        <p className="text-sm font-semibold text-[var(--gubia)]">
          CITA REGISTRADA
        </p>
        <h2 className="mt-2 text-2xl">Conserva tu comprobante</h2>
        <p className="mt-4 font-mono text-xl">{confirmation.folio}</p>
        <p className="mt-4 text-slate-600">
          Tu clave de consulta es privada. Guárdala para consultar la cita desde
          otro dispositivo.
        </p>
        <p className="my-4 break-all rounded-lg bg-slate-100 p-3 font-mono text-sm">
          {confirmation.token}
        </p>
        <a
          className="inline-block rounded-xl bg-[var(--gubia)] px-5 py-3 text-white"
          href={"/cita/" + confirmation.folio}
        >
          Ver comprobante
        </a>
      </section>
    );
  if (!branches.length)
    return (
      <section className="card mt-8 p-7">
        <h2 className="text-xl font-semibold">
          Consulta disponibilidad con tu sucursal
        </h2>
        <p className="mt-3 text-slate-600">
          Por el momento no hay sucursales con agenda en línea habilitada.
        </p>
        <a
          href="https://www.gubia.mx/sucursales.aspx"
          className="mt-4 inline-block font-semibold text-[var(--gubia)]"
        >
          Ver sucursales GUBIA →
        </a>
      </section>
    );
  return (
    <>
      <ol className="my-7 flex gap-4 text-sm" aria-label="Pasos de la reserva">
        {["Estudio y sucursal", "Horario", "Datos y confirmación"].map(
          (s, i) => (
            <li
              key={s}
              aria-current={step === i + 1 ? "step" : undefined}
              className={
                step === i + 1
                  ? "font-bold text-[var(--gubia)]"
                  : "text-slate-500"
              }
            >
              {i + 1}. {s}
            </li>
          ),
        )}
      </ol>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {step === 1 && (
        <form
          className="card grid gap-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void loadSlots();
          }}
        >
          <label>
            Sucursal
            <select
              required
              className={input}
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setService("");
              }}
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estudio
            <select
              required
              disabled={!branch}
              className={input}
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">Selecciona un estudio</option>
              {services
                .filter((s) =>
                  links.some(
                    (l) => l.branch_id === branch && l.service_id === s.id,
                  ),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Fecha
            <input
              required
              className={input}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {selectedService && (
            <p className="text-slate-600">
              {selectedService.price === null
                ? "Precio a confirmar con la sucursal"
                : new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(selectedService.price)}
            </p>
          )}
          <button
            disabled={!ready || busy}
            className="rounded-xl bg-[var(--gubia)] p-4 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Consultando…" : "Ver horarios disponibles"}
          </button>
        </form>
      )}
      {step === 2 && (
        <section className="card p-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mb-5 text-sm underline"
          >
            ← Cambiar selección
          </button>
          <h2 className="text-xl font-semibold">
            {selectedBranch?.name} · {date}
          </h2>
          <p className="my-3 text-slate-600">
            Horarios locales de la sucursal. La disponibilidad se confirma al
            reservar.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {slots.map((s) => (
              <button
                type="button"
                key={s.starts_at}
                aria-pressed={slot === s.starts_at}
                onClick={() => setSlot(s.starts_at)}
                className={
                  "rounded-xl border p-4 " +
                  (slot === s.starts_at
                    ? "bg-[var(--gubia)] text-white"
                    : "bg-white")
                }
              >
                {new Date(s.starts_at).toLocaleTimeString("es-MX", {
                  timeZone: selectedBranch?.timezone,
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </button>
            ))}
          </div>
          {!slots.length && (
            <p className="py-6">
              No hay horarios disponibles en esa fecha. Elige otro día.
            </p>
          )}
          <button
            disabled={!slot || busy}
            onClick={() => void beginDetails()}
            className="mt-6 w-full rounded-xl bg-[var(--gubia)] p-4 font-semibold text-white disabled:opacity-50"
          >
            Continuar
          </button>
        </section>
      )}
      {step === 3 && (
        <form onSubmit={submit} className="card grid gap-5 p-6">
          <button
            type="button"
            className="text-left text-sm underline"
            onClick={() => setStep(2)}
          >
            ← Cambiar horario
          </button>
          <div className="rounded-xl bg-slate-50 p-4">
            <h2 className="font-semibold">{selectedService?.name}</h2>
            <p>
              {selectedBranch?.name} ·{" "}
              {new Date(slot).toLocaleString("es-MX", {
                timeZone: selectedBranch?.timezone,
              })}
            </p>
            {selectedService?.preparation && (
              <p className="mt-3">Preparación: {selectedService.preparation}</p>
            )}
          </div>
          <label>
            Nombre completo
            <input
              className={input}
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
            />
          </label>
          <label>
            Teléfono
            <input
              className={input}
              name="phone"
              required
              type="tel"
              maxLength={20}
              autoComplete="tel"
            />
          </label>
          <label>
            Correo electrónico (opcional)
            <input
              className={input}
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <label>
            Código promocional (opcional)
            <input className={input} name="promo" maxLength={48} />
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="privacy" required className="mt-1" />
            <span>
              He leído y acepto el{" "}
              <a
                href="https://www.gubia.mx/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                aviso de privacidad de GUBIA
              </a>{" "}
              para gestionar mi cita.
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="marketing" className="mt-1" />
            <span>Deseo recibir promociones (opcional).</span>
          </label>
          {siteKey ? (
            <>
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                onReady={() => setScriptReady(true)}
              />
              <div ref={captchaNode} />
            </>
          ) : (
            <p role="status" className="rounded-lg bg-amber-50 p-4">
              La agenda en línea no está disponible. Comunícate con tu sucursal.
            </p>
          )}
          <button
            disabled={busy || !captcha}
            className="rounded-xl bg-[var(--gubia)] p-4 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Registrando…" : "Confirmar cita"}
          </button>
        </form>
      )}
    </>
  );
}
