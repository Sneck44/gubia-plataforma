"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icon";
export type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: string }[];
};
export function AdminNavigation({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const [query, setQuery] = useState("");
  const match = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => match(i.label).includes(match(query))),
    }))
    .filter((g) => g.items.length);
  return (
    <>
      <label className="nav-search">
        <Icon name="search" size={18} />
        <span className="sr-only">Buscar sección del panel</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar sección…"
        />
      </label>
      <Link
        className="nav-item"
        href="/admin"
        aria-current={path === "/admin" ? "page" : undefined}
      >
        <Icon name="home" />
        Inicio
      </Link>
      {visible.map((group) => (
        <nav key={group.label} aria-label={group.label} className="nav-group">
          <p>{group.label}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              className="nav-item"
              href={item.href}
              aria-current={path === item.href ? "page" : undefined}
              onClick={() => setQuery("")}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      ))}
      {!visible.length && (
        <p className="nav-empty">No hay secciones con ese nombre.</p>
      )}
    </>
  );
}
export function MobileDock({
  clinical,
  marketing,
}: {
  clinical: boolean;
  marketing: boolean;
}) {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "Inicio", icon: "home" },
    ...(clinical
      ? [{ href: "/admin/agenda", label: "Agenda", icon: "calendar" }]
      : []),
    ...(marketing
      ? [
          { href: "/admin/qr", label: "Códigos QR", icon: "grid" },
          { href: "/admin/reportes", label: "Indicadores", icon: "chart" },
        ]
      : []),
  ];
  return (
    <nav className="mobile-dock" aria-label="Accesos rápidos">
      {links.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={path === i.href ? "page" : undefined}
        >
          <Icon name={i.icon} />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
