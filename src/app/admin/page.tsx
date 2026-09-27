import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/access";

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, profile } = await requireStaff();
  const { error: message } = await searchParams;
  const cards: [string, number][] = [];
  const jobs: Promise<void>[] = [];
  if (can(profile.role, "clinical:read")) {
    jobs.push(
      (async () => {
        const [appointments, patients] = await Promise.all([
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("patients")
            .select("id", { count: "exact", head: true }),
        ]);
        if (appointments.error || patients.error)
          throw new Error("No se pudieron consultar los registros clínicos.");
        cards.push(
          ["Citas registradas", appointments.count ?? 0],
          ["Pacientes registrados", patients.count ?? 0],
        );
      })(),
    );
  }
  if (can(profile.role, "marketing:read")) {
    jobs.push(
      (async () => {
        const [scans, completed] = await Promise.all([
          supabase
            .from("tracking_events")
            .select("id", { count: "exact", head: true })
            .eq("event_type", "qr_scanned"),
          supabase
            .from("tracking_events")
            .select("id", { count: "exact", head: true })
            .eq("event_type", "appointment_completed"),
        ]);
        if (scans.error || completed.error)
          throw new Error("No se pudieron consultar los eventos.");
        cards.push(
          ["Eventos de escaneo", scans.count ?? 0],
          ["Eventos de cita completada", completed.count ?? 0],
        );
      })(),
    );
  }
  await Promise.all(jobs);
  cards.sort(([a], [b]) => a.localeCompare(b, "es"));
  const clinical = can(profile.role, "clinical:read");
  const marketing = can(profile.role, "marketing:read");
  const actions = [
    ...(clinical
      ? [
          {
            href: "/admin/agenda",
            title: "Revisar la agenda",
            description: "Consulta citas y actualiza su estado.",
            icon: "calendar",
          },
          {
            href: "/admin/pacientes",
            title: "Consultar pacientes",
            description: "Encuentra los registros de tu operación.",
            icon: "people",
          },
        ]
      : []),
    ...(marketing
      ? [
          {
            href: "/admin/qr",
            title: "Gestionar códigos QR",
            description: "Crea y comparte los accesos de tus campañas.",
            icon: "grid",
          },
          {
            href: "/admin/reportes",
            title: "Explorar indicadores",
            description: "Sigue el recorrido desde el escaneo hasta la cita.",
            icon: "chart",
          },
        ]
      : []),
  ];
  const metricRoutes: Record<string, [string, string]> = {
    "Citas registradas": ["/admin/citas", "calendar"],
    "Pacientes registrados": ["/admin/pacientes", "people"],
    "Eventos de escaneo": ["/admin/reportes", "grid"],
    "Eventos de cita completada": ["/admin/conversiones", "check"],
  };
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TU CENTRO DE CONTROL</p>
          <h1>Una visión clara de GUBIA.</h1>
          <p>Revisa la actividad y elige por dónde comenzar.</p>
        </div>
        <span className="workspace-badge">
          <Icon name="shield" size={16} />
          Acceso de personal
        </span>
      </div>
      {message && (
        <p role="alert" className="form-alert">
          {message}
        </p>
      )}
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">CADA CONTACTO CUENTA</span>
          <h2>
            De la primera visita
            <br />a una mejor experiencia.
          </h2>
          <p>Conecta la operación diaria con el seguimiento de tus campañas.</p>
          <Link
            href={clinical ? "/admin/agenda" : "/admin/reportes"}
            className="button button-white"
          >
            {clinical ? "Abrir agenda" : "Ver indicadores"}
            <Icon name="arrow" />
          </Link>
        </div>
        <div className="hero-journey" aria-label="Recorrido del paciente">
          <span>
            <Icon name="grid" />
            Descubrimiento
          </span>
          <i aria-hidden="true" />
          <span>
            <Icon name="calendar" />
            Reserva
          </span>
          <i aria-hidden="true" />
          <span>
            <Icon name="people" />
            Atención
          </span>
        </div>
      </section>
      <div className="section-heading">
        <h2>Actividad registrada</h2>
        <span>Acumulados</span>
      </div>
      <div className="metric-grid">
        {cards.map(([label, count]) => (
          <Link
            className="card metric-card"
            key={label}
            href={metricRoutes[label][0]}
          >
            <div className="metric-top">
              <span className="icon-tile small">
                <Icon name={metricRoutes[label][1]} />
              </span>
              <Icon name="arrow" size={17} />
            </div>
            <strong>{count.toLocaleString("es-MX")}</strong>
            <span>{label}</span>
            <small>
              {count === 0 ? "Aún no hay registros" : "Consultar detalle"}
            </small>
          </Link>
        ))}
      </div>
      <p className="metric-note">
        Datos disponibles para tu rol. Los eventos no equivalen a personas
        únicas ni a ingresos.
      </p>
      <div className="section-heading">
        <h2>¿Qué necesitas hacer?</h2>
        <span>Accesos directos</span>
      </div>
      <div className="action-grid">
        {actions.map((a) => (
          <Link href={a.href} className="card action-card" key={a.href}>
            <span className="icon-tile">
              <Icon name={a.icon} />
            </span>
            <div>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
            </div>
            <Icon name="arrow" size={18} />
          </Link>
        ))}
      </div>
      {can(profile.role, "catalog:write") && (
        <section className="setup-panel">
          <div>
            <span className="eyebrow">PREPARA TU OPERACIÓN</span>
            <h2>Una buena configuración es el primer paso.</h2>
            <p>Revisa estos catálogos antes de habilitar reservas en línea.</p>
          </div>
          <ol>
            {[
              {
                href: "/admin/sucursales",
                label: "Sucursales",
                detail: "Datos y atención en línea",
              },
              {
                href: "/admin/estudios",
                label: "Estudios",
                detail: "Precios y duración",
              },
              {
                href: "/admin/horarios",
                label: "Horarios",
                detail: "Disponibilidad y capacidad",
              },
            ].map((a, i) => (
              <li key={a.href}>
                <Link href={a.href}>
                  <span className="step-number">{i + 1}</span>
                  <span>
                    <strong>{a.label}</strong>
                    <small>{a.detail}</small>
                  </span>
                  <Icon name="arrow" size={16} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
