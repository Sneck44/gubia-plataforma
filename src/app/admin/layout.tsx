import { AdminNavigation, MobileDock } from "@/components/admin-navigation";
import { Icon } from "@/components/icon";
import { AdminMenu } from "@/components/admin-menu";
import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { can, type Permission } from "@/lib/access";
import { logout } from "@/app/login/actions";
const navigation: { label: string; items: [string, string, Permission][] }[] = [
  {
    label: "Operación",
    items: [
      ["agenda", "Agenda", "clinical:read"],
      ["citas", "Citas", "clinical:read"],
      ["pacientes", "Pacientes", "clinical:read"],
    ],
  },
  {
    label: "Catálogos",
    items: [
      ["sucursales", "Sucursales", "clinical:read"],
      ["estudios", "Estudios", "clinical:read"],
      ["horarios", "Horarios y capacidad", "clinical:read"],
      ["disponibilidad", "Estudios por sucursal", "clinical:read"],
    ],
  },
  {
    label: "Marketing",
    items: [
      ["codigos", "Promociones", "marketing:read"],
      ["qr", "Códigos QR", "marketing:read"],
      ["campanas", "Campañas", "marketing:read"],
      ["promotores", "Promotores", "marketing:read"],
    ],
  },
  {
    label: "Inteligencia comercial",
    items: [
      ["reportes", "Indicadores y recorrido", "marketing:read"],
      ["conversiones", "Conversiones", "marketing:read"],
      ["no-convertidos", "Visitantes sin cita", "marketing:read"],
    ],
  },
];
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireStaff();
  const groups = navigation
    .map((group) => ({
      label: group.label,
      items: group.items
        .filter(([, , permission]) => can(profile.role, permission))
        .map(([href, label]) => ({
          href: "/admin/" + href,
          label,
          icon: (
            {
              agenda: "calendar",
              citas: "calendar",
              pacientes: "people",
              sucursales: "pin",
              estudios: "layers",
              horarios: "clock",
              disponibilidad: "layers",
              codigos: "tag",
              qr: "grid",
              campanas: "layers",
              promotores: "people",
              reportes: "chart",
              conversiones: "chart",
              "no-convertidos": "people",
            } as Record<string, string>
          )[href],
        })),
    }))
    .filter((g) => g.items.length);
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#panel-content">
        Ir al contenido
      </a>
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <Link href="/admin" aria-label="GUBIA, inicio del panel">
            <Image
              src="/gubia-logo.png"
              alt="GUBIA Análisis Clínicos"
              width={116}
              height={79}
              priority
            />
          </Link>
          <span className="brand-caption">GESTIÓN EMPRESARIAL</span>
        </div>
        <AdminMenu>
          <AdminNavigation groups={groups} />
          <div className="sidebar-account">
            <span className="avatar">
              {(profile.full_name || "G").slice(0, 1)}
            </span>
            <div>
              <strong>{profile.full_name || "Personal"}</strong>
              <span>
                {profile.role === "administrador"
                  ? "Administrador"
                  : profile.role}
              </span>
            </div>
          </div>
          <form action={logout}>
            <button className="logout-button">
              <Icon name="exit" size={18} />
              Cerrar sesión
            </button>
          </form>
        </AdminMenu>
      </aside>
      <div className="admin-content" id="panel-content" tabIndex={-1}>
        <header className="panel-topbar">
          <span>
            <span className="status-dot" />
            Espacio de trabajo GUBIA
          </span>
          <Link href="/" className="quiet-link">
            Ver inicio <Icon name="arrow" size={16} />
          </Link>
        </header>
        {children}
      </div>
      <MobileDock
        clinical={can(profile.role, "clinical:read")}
        marketing={can(profile.role, "marketing:read")}
      />
    </div>
  );
}
