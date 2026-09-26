import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/access";
const stageNames: Record<string, string> = {
  qr_scanned: "Escaneó",
  landing_viewed: "Exploró",
  service_selected: "Seleccionó estudio",
  appointment_started: "Inició cita",
  appointment_completed: "Generó cita",
  appointment_attended: "Asistió",
  appointment_cancelled: "Canceló",
  appointment_no_show: "No asistió",
};
export async function IntelligencePage({
  section,
  query,
}: {
  section: string;
  query: Record<string, string | undefined>;
}) {
  const { supabase, profile } = await requireStaff("marketing:read");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from || "")
    ? query.from!
    : today.slice(0, 8) + "01";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to || "") ? query.to! : today;
  const a = new Date(from + "T00:00:00-06:00"),
    b = new Date(to + "T00:00:00-06:00");
  b.setUTCDate(b.getUTCDate() + 1);
  if (
    !Number.isFinite(a.getTime()) ||
    !Number.isFinite(b.getTime()) ||
    b <= a ||
    b.getTime() - a.getTime() > 366 * 86400000
  )
    return (
      <main className="p-8">
        <h1>Selecciona un rango válido de hasta un año.</h1>
        <Link href={"/admin/" + section}>Restablecer filtros</Link>
      </main>
    );
  const filters: Record<string, string> = {};
  for (const key of [
    "branch_id",
    "campaign_id",
    "qr_id",
    "promoter_id",
    "service_id",
  ])
    if (
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        query[key] || "",
      )
    )
      filters[key] = query[key]!;
  if (query.channel) filters.channel = query.channel.slice(0, 100);
  const metrics = await supabase.rpc("marketing_metrics", {
    p_from: a.toISOString(),
    p_to: b.toISOString(),
    p_filters: filters,
  });
  if (metrics.error)
    throw new Error("No se pudieron consultar los indicadores.");
  const m = metrics.data || {};
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  const clinical = can(profile.role, "clinical:read");
  let request = supabase
    .from("tracking_sessions")
    .select(
      "id,qr_id,campaign_id,branch_id,service_id,channel,promoter_id,appointment_id,first_seen_at,last_seen_at,last_stage,campaigns(name),qr_codes(name),branches(name),services(name),promoters(name)" +
        (clinical ? ",appointments(folio,status,patients(full_name))" : ""),
      { count: "exact" },
    )
    .gte("first_seen_at", a.toISOString())
    .lt("first_seen_at", b.toISOString())
    .order("last_seen_at", { ascending: false });
  Object.entries(filters).forEach(([k, v]) => (request = request.eq(k, v)));
  if (section === "no-convertidos")
    request = request.is("appointment_id", null);
  if (section === "conversiones")
    request = request.not("appointment_id", "is", null);
  const [sessions, branches, campaigns, qrs, promoters, services] =
    await Promise.all([
      request.range((page - 1) * 30, page * 30 - 1),
      supabase.from("branches").select("id,name").order("name"),
      supabase.from("campaigns").select("id,name").order("name"),
      supabase.from("qr_codes").select("id,name").order("name"),
      supabase.from("promoters").select("id,name").order("name"),
      supabase.from("services").select("id,name").order("name").limit(2000),
    ]);
  if (
    sessions.error ||
    branches.error ||
    campaigns.error ||
    qrs.error ||
    promoters.error ||
    services.error
  )
    throw new Error("No fue posible cargar el reporte.");
  const title =
    section === "conversiones"
      ? "Conversiones"
      : section === "no-convertidos"
        ? "Visitantes sin cita"
        : "Inteligencia comercial";
  const selects = [
    ["branch_id", "Sucursal", branches.data],
    ["campaign_id", "Campaña", campaigns.data],
    ["qr_id", "Código QR", qrs.data],
    ["promoter_id", "Promotor", promoters.data],
    ["service_id", "Estudio", services.data],
  ] as const;
  const steps = [
    ["scans", "Escaneos"],
    ["scanned_visitors", "Visitantes que escanearon"],
    ["landing", "Exploraron"],
    ["selected", "Seleccionaron estudio"],
    ["started", "Iniciaron cita"],
    ["completed", "Generaron cita"],
    ["attended", "Asistieron"],
  ];
  return (
    <main className="p-5 md:p-9">
      <p className="text-sm text-slate-500">GUBIA · Inteligencia comercial</p>
      <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
      <form className="card my-6 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">
          Primera visita desde
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        <label className="text-sm">
          Hasta
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        {selects.map(([key, label, options]) => (
          <label key={key} className="text-sm">
            {label}
            <select
              name={key}
              defaultValue={filters[key] || ""}
              className="mt-1 w-full rounded-lg border bg-white p-2"
            >
              <option value="">Todos</option>
              {options?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="text-sm">
          Canal
          <input
            name="channel"
            defaultValue={filters.channel || ""}
            className="mt-1 w-full rounded-lg border p-2"
          />
        </label>
        <button className="rounded-lg bg-[var(--gubia)] px-5 py-3 text-white">
          Aplicar filtros
        </button>
      </form>
      <p className="mb-5 max-w-4xl text-sm text-slate-600">
        Visitantes cuya primera visita ocurrió en el intervalo, con sus
        resultados acumulados hasta hoy. Atribución a la primera campaña
        registrada. Una sesión sin cita se considera abandonada tras 30 minutos
        sin actividad después de iniciar la reserva.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["visitors", "Sesiones únicas"],
          ["completed", "Citas generadas"],
          ["abandoned", "Reservas abandonadas"],
          ["conversion_rate", "Conversión (%)"],
          ["attended", "Asistencias"],
          ["cancelled", "Cancelaciones"],
          ["no_show", "No asistieron"],
          ["attributed_revenue", "Ingreso atribuible (MXN)"],
        ].map(([key, label]) => (
          <div key={key} className="card p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <strong className="mt-2 block text-3xl">
              {Number(m[key] || 0).toLocaleString("es-MX", {
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
        ))}
      </div>
      <section className="card my-6 p-5">
        <h2 className="text-xl font-semibold">Recorrido de conversión</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map(([key, label], i) => (
            <div key={key} className="border-l-4 border-[var(--gubia)] pl-3">
              <p className="text-sm">{label}</p>
              <strong className="text-xl">{Number(m[key] || 0)}</strong>
              {i > 1 && (
                <p className="text-xs text-slate-500">
                  {Number(m[steps[i - 1][0]])
                    ? Math.round(
                        (100 * Number(m[key])) / Number(m[steps[i - 1][0]]),
                      )
                    : 0}
                  % respecto a la etapa anterior
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "Visitante",
                "QR / campaña",
                "Canal / promotor",
                "Sucursal / estudio",
                "Actividad",
                "Etapa",
                "Cita",
              ].map((t) => (
                <th key={t} className="p-4">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sessions.data || []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-4">
                  Visitante #{s.id.slice(0, 8).toUpperCase()}
                  {clinical && s.appointments?.patients?.full_name && (
                    <p className="mt-2 font-medium">
                      {s.appointments.patients.full_name}
                    </p>
                  )}
                </td>
                <td className="p-4">
                  {s.qr_codes?.name || "Directo"}
                  <br />
                  {s.campaigns?.name || "—"}
                </td>
                <td className="p-4">
                  {s.channel || "—"}
                  <br />
                  {s.promoters?.name || "—"}
                </td>
                <td className="p-4">
                  {s.branches?.name || "—"}
                  <br />
                  {s.services?.name || "—"}
                </td>
                <td className="min-w-40 p-4">
                  {new Date(s.last_seen_at).toLocaleString("es-MX", {
                    timeZone: "America/Mexico_City",
                  })}
                </td>
                <td className="p-4">
                  {!s.appointment_id &&
                  s.last_stage === "appointment_started" &&
                  Date.now() - Date.parse(s.last_seen_at) > 1800000
                    ? "Abandonó"
                    : stageNames[s.last_stage] || s.last_stage}
                </td>
                <td className="p-4">
                  {s.appointment_id
                    ? clinical
                      ? s.appointments?.folio || "Generada"
                      : "Generada"
                    : "Sin cita"}
                </td>
              </tr>
            ))}
            {!sessions.data?.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No hay visitantes con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm">
        {sessions.count || 0} sesiones · página {page}
      </p>
      <nav className="mt-3 flex gap-6">
        {page > 1 && (
          <Link
            href={
              "?" +
              new URLSearchParams({
                ...(Object.fromEntries(
                  Object.entries(query).filter(([, v]) => v !== undefined),
                ) as Record<string, string>),
                page: String(page - 1),
              })
            }
          >
            Anterior
          </Link>
        )}
        {page * 30 < (sessions.count || 0) && (
          <Link
            href={
              "?" +
              new URLSearchParams({
                ...(Object.fromEntries(
                  Object.entries(query).filter(([, v]) => v !== undefined),
                ) as Record<string, string>),
                page: String(page + 1),
              })
            }
          >
            Siguiente
          </Link>
        )}
      </nav>
    </main>
  );
}
