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
  return (
    <div className="min-h-screen bg-[#f4f6f3] lg:flex">
      <aside className="bg-[var(--gubia)] p-5 text-white lg:w-64 lg:shrink-0">
        <Link href="/admin" className="text-2xl font-bold tracking-widest">
          <Image src="/gubia-logo.png" alt="GUBIA Análisis Clínicos" width={126} height={86} className="rounded-lg bg-white p-2"/>
        </Link>
        <p className="mt-2 text-sm text-white/75">
          {profile.full_name || "Personal"} · {profile.role}
        </p>
        <details open className="mt-6">
          <summary className="cursor-pointer text-sm lg:hidden">
            Menú de administración
          </summary>
          <Link
            href="/admin"
            className="mt-3 block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Inicio
          </Link>
          {navigation.map((group) => {
            const items = group.items.filter(([, , permission]) =>
              can(profile.role, permission),
            );
            return items.length ? (
              <nav key={group.label} aria-label={group.label} className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-wider text-white/60">
                  {group.label}
                </p>
                {items.map(([href, label]) => (
                  <Link
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                    key={href}
                    href={"/admin/" + href}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            ) : null;
          })}
          <form action={logout} className="mt-8">
            <button className="w-full rounded-lg border border-white/40 px-3 py-3">
              Cerrar sesión
            </button>
          </form>
        </details>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
