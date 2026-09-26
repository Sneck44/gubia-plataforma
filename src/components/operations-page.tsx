import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/access";
import { updateAppointment } from "@/app/admin/appointment-actions";
const states: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  attended: "Atendida",
  cancelled: "Cancelada",
  no_show: "No asistió",
  rescheduled: "Reprogramada",
};
export async function OperationsPage({
  section,
  query,
}: {
  section: string;
  query: Record<string, string | undefined>;
}) {
  const { supabase, profile } = await requireStaff("clinical:read");
  const patients = section === "pacientes";
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  let request = patients
    ? supabase
        .from("patients")
        .select("id,full_name,phone,email,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
    : supabase
        .from("appointments")
        .select(
          "id,folio,starts_at,status,attributed_revenue,patients(full_name,phone),branches(name,timezone),appointment_services(services(name))",
          { count: "exact" },
        )
        .order("starts_at", { ascending: false });
  if (query.q) {
    request = patients
      ? request.ilike("full_name", "%" + query.q.slice(0, 80) + "%")
      : request.ilike("folio", "%" + query.q.slice(0, 40) + "%");
  }
  if (!patients && query.status && states[query.status])
    request = request.eq("status", query.status);
  if (!patients && query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    const start = new Date(query.date + "T00:00:00-06:00");
    if (Number.isFinite(start.getTime()))
      request = request
        .gte("starts_at", start.toISOString())
        .lt("starts_at", new Date(start.getTime() + 86400000).toISOString());
  }
  const { data, error, count } = await request.range(
    (page - 1) * 30,
    page * 30 - 1,
  );
  if (error) throw new Error("No se pudieron cargar los registros.");
  return (
    <main className="p-5 md:p-9">
      <p className="text-sm text-slate-500">GUBIA · Operación</p>
      <h1 className="mt-1 text-3xl font-semibold">
        {patients ? "Pacientes" : section === "agenda" ? "Agenda" : "Citas"}
      </h1>
      {query.error && (
        <p role="alert" className="my-4 text-red-700">
          {query.error}
        </p>
      )}
      {query.saved && (
        <p role="status" className="my-4 text-green-700">
          Cambios guardados.
        </p>
      )}
      <form className="my-6 flex flex-wrap gap-3">
        <input
          name="q"
          aria-label={patients ? "Buscar paciente" : "Buscar folio"}
          placeholder={patients ? "Nombre del paciente" : "Folio"}
          defaultValue={query.q}
          className="rounded-lg border p-3"
        />
        {!patients && (
          <>
            <input
              name="date"
              type="date"
              aria-label="Fecha, horario centro de México"
              defaultValue={query.date}
              className="rounded-lg border p-3"
            />
            <select
              name="status"
              aria-label="Estado de cita"
              defaultValue={query.status}
              className="rounded-lg border p-3"
            >
              <option value="">Todos los estados</option>
              {Object.entries(states).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </>
        )}
        <button className="rounded-lg bg-[var(--gubia)] px-5 text-white">
          Filtrar
        </button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {(patients
                ? ["Paciente", "Teléfono", "Correo"]
                : [
                    "Folio",
                    "Paciente",
                    "Sucursal",
                    "Fecha local",
                    "Estudios",
                    "Estado",
                    "Acciones",
                  ]
              ).map((s) => (
                <th className="p-4" key={s}>
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row: any) =>
              patients ? (
                <tr className="border-t" key={row.id}>
                  <td className="p-4">{row.full_name}</td>
                  <td className="p-4">{row.phone || "—"}</td>
                  <td className="p-4">{row.email || "—"}</td>
                </tr>
              ) : (
                <tr className="border-t" key={row.id}>
                  <td className="p-4 font-mono">{row.folio}</td>
                  <td className="p-4">
                    {row.patients?.full_name}
                    <br />
                    {row.patients?.phone}
                  </td>
                  <td className="p-4">{row.branches?.name}</td>
                  <td className="min-w-40 p-4">
                    {new Date(row.starts_at).toLocaleString("es-MX", {
                      timeZone: row.branches?.timezone || "America/Mexico_City",
                    })}
                  </td>
                  <td className="p-4">
                    {row.appointment_services
                      ?.map((s: any) => s.services?.name)
                      .join(", ")}
                  </td>
                  <td className="p-4">{states[row.status]}</td>
                  <td className="min-w-48 p-4">
                    {can(profile.role, "clinical:write") &&
                      ["pending", "confirmed", "attended"].includes(
                        row.status,
                      ) && (
                        <form action={updateAppointment} className="grid gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <select
                            name="status"
                            aria-label="Nuevo estado"
                            className="rounded-lg border p-2"
                            defaultValue={
                              row.status === "attended"
                                ? "attended"
                                : "confirmed"
                            }
                          >
                            {["confirmed", "attended", "cancelled", "no_show"]
                              .filter(
                                (s) =>
                                  row.status !== "attended" || s === "attended",
                              )
                              .map((s) => (
                                <option key={s} value={s}>
                                  {states[s]}
                                </option>
                              ))}
                          </select>
                          <input
                            name="revenue"
                            type="number"
                            step="0.01"
                            min="0"
                            aria-label="Ingreso recibido, solo para atendida"
                            placeholder="Ingreso recibido (atendida)"
                            className="rounded-lg border p-2"
                          />
                          <button className="rounded-lg border p-2">
                            Guardar estado
                          </button>
                        </form>
                      )}
                  </td>
                </tr>
              ),
            )}
            {!data?.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No hay registros con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-between text-sm">
        <span>
          {count || 0} registros · página {page}
        </span>
        <div className="flex gap-4">
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
          {page * 30 < (count || 0) && (
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
        </div>
      </div>
    </main>
  );
}
