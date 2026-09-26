import { createClient } from "@/lib/supabase/server";
import { Booking } from "./wizard";
export default async function Agendar() {
  const db = await createClient();
  const [branches, services, links] = await Promise.all([
    db
      .from("branches")
      .select("id,name,address,timezone")
      .eq("active", true)
      .eq("booking_enabled", true)
      .order("name"),
    db
      .from("services")
      .select("id,name,price,preparation,duration_minutes")
      .eq("active", true)
      .order("name"),
    db
      .from("branch_services")
      .select("branch_id,service_id")
      .eq("active", true),
  ]);
  return (
    <main className="min-h-screen bg-[var(--cream)] px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="font-bold text-[var(--gubia)]">
          ← GUBIA
        </a>
        <h1 className="mt-7 text-3xl font-semibold">Agenda tu cita</h1>
        <p className="mt-2 text-slate-600">
          Selecciona un estudio y un horario disponible.
        </p>
        {branches.error || services.error || links.error ? (
          <p role="alert" className="card mt-6 p-6">
            No pudimos consultar la agenda. Intenta nuevamente.
          </p>
        ) : (
          <Booking
            branches={branches.data || []}
            services={services.data || []}
            links={links.data || []}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
          />
        )}
      </div>
    </main>
  );
}
