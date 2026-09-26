import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/access";

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const { error: message } = await searchParams;
  const cards: [string, number][] = [];
  const jobs: Promise<void>[] = [];
  if (can(profile.role, "clinical:read")) {
    jobs.push((async () => {
      const [appointments, patients] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }),
      ]);
      if (appointments.error || patients.error) throw new Error("No se pudieron consultar los registros clínicos.");
      cards.push(["Citas registradas", appointments.count ?? 0], ["Pacientes registrados", patients.count ?? 0]);
    })());
  }
  if (can(profile.role, "marketing:read")) {
    jobs.push((async () => {
      const [scans, completed] = await Promise.all([
        supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("event_type", "qr_scanned"),
        supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("event_type", "appointment_completed"),
      ]);
      if (scans.error || completed.error) throw new Error("No se pudieron consultar los eventos.");
      cards.push(["Eventos de escaneo", scans.count ?? 0], ["Eventos de cita completada", completed.count ?? 0]);
    })());
  }
  await Promise.all(jobs);
  cards.sort(([a], [b]) => a.localeCompare(b, "es"));
  return <main className="p-6 md:p-10">
    <p className="text-sm text-slate-500">GUBIA · Centro de control</p>
    <h1 className="text-3xl font-semibold">Actividad registrada</h1>
    {message && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">{message}</p>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, count]) => <div className="card p-5" key={label}><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-semibold">{count.toLocaleString("es-MX")}</div></div>)}
    </div>
    <p className="mt-5 text-sm text-slate-600">Acumulados de los registros disponibles para tu rol. Los eventos no equivalen a personas únicas ni a ingresos.</p>
  </main>;
}
