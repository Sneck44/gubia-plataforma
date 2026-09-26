import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/access";
import { catalogs } from "@/lib/catalogs";
import { saveCatalog, duplicateQR } from "@/app/admin/catalog-actions";
import { QRCard } from "./qr-card";
export async function CatalogPage({
  section,
  query,
}: {
  section: string;
  query: {
    edit?: string;
    error?: string;
    saved?: string;
    page?: string;
    q?: string;
  };
}) {
  const c = catalogs[section];
  const { supabase, profile } = await requireStaff(c.read);
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  let request = supabase
    .from(c.table)
    .select("*", { count: "exact" })
    .range((page - 1) * 30, page * 30 - 1);
  if (c.fields.some((f) => f.key === "name")) {
    request = request.order("name");
    if (query.q)
      request = request.ilike("name", "%" + query.q.slice(0, 80) + "%");
  } else request = request.order(c.fields[0].key);
  const refs = [
    ...new Set(c.fields.flatMap((f) => (f.reference ? [f.reference] : []))),
  ];
  const [rows, ...options] = await Promise.all([
    request,
    ...refs.map((table) =>
      supabase.from(table).select("id,name").order("name").limit(2000),
    ),
  ]);
  if (rows.error || options.some((o) => o.error))
    throw new Error("No fue posible cargar el catálogo.");
  const lookup: Record<string, { id: string; name: string }[]> = {};
  refs.forEach((t, i) => (lookup[t] = options[i].data || []));
  let editing: Record<string, unknown> | null = null;
  if (
    query.edit &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      query.edit,
    )
  ) {
    const result = await supabase
      .from(c.table)
      .select("*")
      .eq("id", query.edit)
      .single();
    if (result.error) throw new Error("Registro no disponible.");
    editing = result.data;
  }
  const write = can(profile.role, c.write);
  function display(key: string, value: unknown) {
    const field = c.fields.find((f) => f.key === key);
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Sí" : "No";
    if (field?.reference)
      return (
        lookup[field.reference]?.find((x) => x.id === value)?.name ||
        String(value)
      );
    if (field?.options)
      return (
        field.options.find(([v]) => v === String(value))?.[1] || String(value)
      );
    return String(value);
  }
  return (
    <main className="p-5 md:p-9">
      <p className="text-sm text-slate-500">GUBIA · Administración</p>
      <h1 className="mt-1 text-3xl font-semibold">{c.title}</h1>
      {section === "qr" && (
        <p className="mt-3 max-w-3xl text-slate-600">
          Cada QR conserva su enlace aunque cambies la campaña, sucursal o
          estudio. El destino es la agenda de GUBIA. Las atribuciones ya
          registradas se conservan.
        </p>
      )}
      {query.error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
          {query.error}
        </p>
      )}
      {query.saved && (
        <p role="status" className="mt-4 text-green-700">
          Cambios guardados.
        </p>
      )}
      {write && (
        <details open={!!editing} className="card my-6 p-5">
          <summary className="cursor-pointer font-semibold">
            {editing ? "Editar registro" : "Crear o configurar registro"}
          </summary>
          <form action={saveCatalog} className="mt-5 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="catalog" value={section} />
            {editing && (
              <input type="hidden" name="id" value={String(editing.id)} />
            )}{" "}
            {c.fields.map((f) => (
              <label
                key={f.key}
                className={
                  f.type === "textarea"
                    ? "md:col-span-2"
                    : "flex flex-col gap-1"
                }
              >
                {f.type !== "checkbox" && (
                  <span className="text-sm font-medium">
                    {f.label}
                    {f.required ? " *" : ""}
                  </span>
                )}
                {f.type === "checkbox" ? (
                  <span className="flex gap-3 py-2">
                    <input
                      type="checkbox"
                      name={f.key}
                      defaultChecked={
                        editing ? !!editing[f.key] : f.key === "active"
                      }
                    />
                    {f.label}
                  </span>
                ) : f.type === "select" ? (
                  <select
                    name={f.key}
                    required={f.required}
                    defaultValue={String(editing?.[f.key] ?? "")}
                    className="rounded-lg border bg-white p-3"
                  >
                    <option value="">Seleccionar</option>
                    {(f.reference
                      ? (lookup[f.reference] || []).map((x) => [x.id, x.name])
                      : f.options || []
                    ).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    name={f.key}
                    defaultValue={String(editing?.[f.key] ?? "")}
                    maxLength={2000}
                    className="mt-1 w-full rounded-lg border p-3"
                  />
                ) : (
                  <input
                    name={f.key}
                    type={f.type || "text"}
                    required={f.required}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    maxLength={300}
                    defaultValue={
                      f.type === "datetime-local" && editing?.[f.key]
                        ? new Date(
                            Date.parse(String(editing[f.key])) - 21600000,
                          )
                            .toISOString()
                            .slice(0, 16)
                        : String(editing?.[f.key] ?? "")
                    }
                    className="rounded-lg border p-3"
                  />
                )}
              </label>
            ))}
            <div className="flex items-center gap-5 md:col-span-2">
              <button className="rounded-xl bg-[var(--gubia)] px-6 py-3 font-semibold text-white">
                Guardar
              </button>
              {editing && (
                <Link href={"/admin/" + section} className="underline">
                  Cancelar edición
                </Link>
              )}
            </div>
          </form>
        </details>
      )}
      {c.fields.some((f) => f.key === "name") && (
        <form className="my-5 flex gap-3">
          <input
            aria-label="Buscar por nombre"
            name="q"
            placeholder="Buscar por nombre"
            defaultValue={query.q}
            className="min-w-0 flex-1 rounded-lg border p-3"
          />
          <button className="rounded-lg border px-5">Buscar</button>
        </form>
      )}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {c.fields.slice(0, section === "qr" ? 3 : 5).map((f) => (
                <th key={f.key} className="p-4">
                  {f.label}
                </th>
              ))}
              <th className="p-4">Estado</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map((row: Record<string, unknown>, i: number) => (
              <tr key={String(row.id || i)} className="border-t">
                {c.fields.slice(0, section === "qr" ? 3 : 5).map((f) => (
                  <td key={f.key} className="max-w-xs p-4">
                    {display(f.key, row[f.key])}
                  </td>
                ))}
                <td className="p-4">
                  {row.draft
                    ? "Borrador"
                    : row.status === "paused"
                      ? "Pausada"
                      : row.status === "exhausted"
                        ? "Agotada"
                        : row.status === "expired" ||
                            (row.ends_at &&
                              Date.parse(String(row.ends_at)) < Date.now())
                          ? "Vencida"
                          : row.starts_at &&
                              Date.parse(String(row.starts_at)) > Date.now()
                            ? "Programada"
                            : row.archived
                              ? "Archivado"
                              : row.active === false
                                ? "Inactivo"
                                : "Activo"}
                </td>
                <td className="min-w-48 p-4">
                  {write && row.id ? (
                    <Link
                      className="underline"
                      href={"/admin/" + section + "?edit=" + row.id}
                    >
                      Editar
                    </Link>
                  ) : null}
                  {section === "qr" && (
                    <>
                      <div className="mt-3">
                        <QRCard
                          token={String(row.token)}
                          name={String(row.name)}
                        />
                      </div>
                      {write && (
                        <form action={duplicateQR} className="mt-3">
                          <input
                            type="hidden"
                            name="id"
                            value={String(row.id)}
                          />
                          <button className="underline">
                            Duplicar como inactivo
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.data?.length && (
              <tr>
                <td className="p-8 text-center text-slate-500" colSpan={7}>
                  No hay registros con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <nav
        className="mt-5 flex items-center justify-between text-sm"
        aria-label="Paginación"
      >
        <span>
          {rows.count || 0} registros · página {page}
        </span>
        <div className="flex gap-5">
          {page > 1 && (
            <Link
              href={
                "?page=" +
                (page - 1) +
                "&q=" +
                encodeURIComponent(query.q || "")
              }
            >
              Anterior
            </Link>
          )}
          {page * 30 < (rows.count || 0) && (
            <Link
              href={
                "?page=" +
                (page + 1) +
                "&q=" +
                encodeURIComponent(query.q || "")
              }
            >
              Siguiente
            </Link>
          )}
        </div>
      </nav>
    </main>
  );
}
