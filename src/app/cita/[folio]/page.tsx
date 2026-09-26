import { cookies } from "next/headers";
import { gateway } from "@/lib/gateway";
export default async function Appointment({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  const token = (await cookies()).get("gubia_manage_" + folio)?.value;
  const result = token
    ? await gateway({ action: "lookup", folio, management_token: token })
    : null;
  const a = result?.data;
  return (
    <main className="min-h-screen bg-[var(--cream)] p-6">
      <section className="card mx-auto mt-8 max-w-2xl p-7">
        <a href="/">← GUBIA</a>
        <h1 className="mt-5 text-3xl font-semibold">Comprobante de cita</h1>
        {a ? (
          <>
            <p className="my-5 font-mono text-xl">{a.folio}</p>
            <dl className="grid gap-3">
              <div>
                <dt className="text-sm text-slate-500">Sucursal</dt>
                <dd>
                  {a.branch}
                  <br />
                  {a.address}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Fecha y hora local</dt>
                <dd>
                  {new Date(a.starts_at).toLocaleString("es-MX", {
                    timeZone: a.timezone,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Estado</dt>
                <dd>
                  {(
                    {
                      pending: "Pendiente",
                      confirmed: "Confirmada",
                      attended: "Atendida",
                      cancelled: "Cancelada",
                      no_show: "No asistió",
                      rescheduled: "Reprogramada",
                    } as Record<string, string>
                  )[a.status] || a.status}
                </dd>
              </div>
            </dl>
            {a.services?.map(
              (s: { name: string; preparation: string | null }) => (
                <div key={s.name} className="mt-5 rounded-xl bg-slate-50 p-4">
                  <strong>{s.name}</strong>
                  {s.preparation && <p className="mt-2">{s.preparation}</p>}
                </div>
              ),
            )}
          </>
        ) : (
          <p className="mt-5">
            Para proteger tu información, necesitas la clave de consulta además
            del folio.{" "}
            <a href="/consultar" className="underline">
              Consultar una cita
            </a>
          </p>
        )}
      </section>
    </main>
  );
}
