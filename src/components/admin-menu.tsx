"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function AdminMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (ref.current) ref.current.open = desktop.matches;
    };
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, [pathname]);
  return (
    <details ref={ref} className="admin-menu mt-4 lg:mt-6">
      <summary className="rounded-lg border border-white/40 px-3 py-3 font-semibold lg:hidden">
        Menú de administración
      </summary>
      <div>{children}</div>
    </details>
  );
}
