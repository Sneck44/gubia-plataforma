import type { Permission } from "./access";
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "checkbox"
    | "select"
    | "time"
    | "datetime-local";
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  options?: [string, string][];
  reference?: string;
};
export type Catalog = {
  table: string;
  title: string;
  read: Permission;
  write: Permission;
  fields: Field[];
  composite?: string;
};
const active: Field = { key: "active", label: "Activo", type: "checkbox" };
export const catalogs: Record<string, Catalog> = {
  codigos: {
    table: "promo_codes",
    title: "Promociones",
    read: "marketing:read",
    write: "marketing:write",
    fields: [
      { key: "name", label: "Nombre", required: true },
      { key: "code", label: "Código promocional", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      {
        key: "discount_type",
        label: "Tipo de descuento",
        type: "select",
        required: true,
        options: [
          ["percentage", "Porcentaje"],
          ["fixed", "Monto fijo"],
        ],
      },
      {
        key: "discount_value",
        label: "Descuento",
        type: "number",
        min: 0,
        max: 1000000,
        step: "0.01",
        required: true,
      },
      {
        key: "starts_at",
        label: "Inicio (hora centro de México)",
        type: "datetime-local",
      },
      {
        key: "ends_at",
        label: "Fin (hora centro de México)",
        type: "datetime-local",
      },
      {
        key: "usage_limit",
        label: "Límite de usos (vacío: sin límite)",
        type: "number",
        min: 1,
        max: 2147483647,
      },
      {
        key: "branch_id",
        label: "Sucursal (vacío: cualquiera)",
        type: "select",
        reference: "branches",
      },
      {
        key: "service_id",
        label: "Estudio (vacío: cualquiera)",
        type: "select",
        reference: "services",
      },
      {
        key: "campaign_id",
        label: "Campaña",
        type: "select",
        reference: "campaigns",
      },
      {
        key: "promoter_id",
        label: "Promotor",
        type: "select",
        reference: "promoters",
      },
      { key: "channel", label: "Canal" },
      {
        key: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: [
          ["active", "Activa / programada por fecha"],
          ["paused", "Pausada"],
          ["expired", "Vencida"],
          ["exhausted", "Agotada"],
        ],
      },
      {
        key: "draft",
        label: "Borrador (no puede utilizarse)",
        type: "checkbox",
      },
    ],
  },
  sucursales: {
    table: "branches",
    title: "Sucursales",
    read: "clinical:read",
    write: "catalog:write",
    fields: [
      { key: "name", label: "Nombre", required: true },
      {
        key: "slug",
        label: "Identificador (letras y guiones)",
        required: true,
      },
      { key: "address", label: "Dirección" },
      { key: "city", label: "Municipio" },
      { key: "state", label: "Estado" },
      { key: "phone", label: "Teléfono" },
      {
        key: "timezone",
        label: "Zona horaria",
        type: "select",
        required: true,
        options: [
          ["America/Mexico_City", "Centro de México"],
          ["America/Tijuana", "Baja California"],
          ["America/Cancun", "Quintana Roo"],
        ],
      },
      { key: "published_hours", label: "Horario publicado" },
      { key: "source_url", label: "Fuente oficial" },
      active,
      {
        key: "booking_enabled",
        label:
          "Habilitar agenda en línea (configura horarios y estudios antes)",
        type: "checkbox",
      },
    ],
  },
  estudios: {
    table: "services",
    title: "Estudios y servicios",
    read: "clinical:read",
    write: "catalog:write",
    fields: [
      { key: "name", label: "Nombre", required: true },
      {
        key: "slug",
        label: "Identificador (letras y guiones)",
        required: true,
      },
      { key: "category", label: "Categoría" },
      { key: "description", label: "Descripción", type: "textarea" },
      {
        key: "price",
        label: "Precio confirmado (MXN)",
        type: "number",
        min: 0,
        max: 10000000,
        step: "0.01",
      },
      {
        key: "duration_minutes",
        label: "Duración configurada (minutos)",
        type: "number",
        min: 5,
        max: 480,
        required: true,
      },
      { key: "preparation", label: "Preparación verificada", type: "textarea" },
      active,
    ],
  },
  horarios: {
    table: "branch_hours",
    title: "Horarios y capacidad",
    read: "clinical:read",
    write: "catalog:write",
    fields: [
      {
        key: "branch_id",
        label: "Sucursal",
        type: "select",
        reference: "branches",
        required: true,
      },
      {
        key: "weekday",
        label: "Día",
        type: "select",
        required: true,
        options: [
          ["0", "Domingo"],
          ["1", "Lunes"],
          ["2", "Martes"],
          ["3", "Miércoles"],
          ["4", "Jueves"],
          ["5", "Viernes"],
          ["6", "Sábado"],
        ],
      },
      {
        key: "opens_at",
        label: "Apertura (hora local)",
        type: "time",
        required: true,
      },
      {
        key: "closes_at",
        label: "Cierre (hora local)",
        type: "time",
        required: true,
      },
      {
        key: "slot_minutes",
        label: "Intervalo entre horarios (minutos)",
        type: "number",
        min: 5,
        max: 480,
        required: true,
      },
      {
        key: "capacity",
        label: "Capacidad simultánea",
        type: "number",
        min: 1,
        max: 100,
        required: true,
      },
      active,
    ],
  },
  disponibilidad: {
    table: "branch_services",
    title: "Estudios por sucursal",
    read: "clinical:read",
    write: "catalog:write",
    composite: "branch_id,service_id",
    fields: [
      {
        key: "branch_id",
        label: "Sucursal",
        type: "select",
        reference: "branches",
        required: true,
      },
      {
        key: "service_id",
        label: "Estudio",
        type: "select",
        reference: "services",
        required: true,
      },
      active,
    ],
  },
  campanas: {
    table: "campaigns",
    title: "Campañas",
    read: "marketing:read",
    write: "marketing:write",
    fields: [
      { key: "name", label: "Nombre", required: true },
      { key: "description", label: "Objetivo y descripción", type: "textarea" },
      active,
    ],
  },
  promotores: {
    table: "promoters",
    title: "Promotores",
    read: "marketing:read",
    write: "marketing:write",
    fields: [
      { key: "name", label: "Nombre", required: true },
      { key: "email", label: "Correo" },
      { key: "phone", label: "Teléfono" },
      active,
    ],
  },
  qr: {
    table: "qr_codes",
    title: "Códigos QR dinámicos",
    read: "marketing:read",
    write: "marketing:write",
    fields: [
      { key: "name", label: "Nombre", required: true },
      {
        key: "kind",
        label: "Tipo",
        type: "select",
        required: true,
        options: [
          ["promotion", "Promoción"],
          ["campaign", "Campaña"],
          ["branch", "Sucursal"],
          ["service", "Estudio"],
          ["package", "Paquete"],
          ["promoter", "Promotor"],
          ["event", "Evento"],
          ["print", "Material impreso"],
          ["social", "Red social"],
          ["other", "Otro"],
        ],
      },
      {
        key: "promo_code_id",
        label: "Promoción",
        type: "select",
        reference: "promo_codes",
      },
      {
        key: "campaign_id",
        label: "Campaña",
        type: "select",
        reference: "campaigns",
      },
      {
        key: "promoter_id",
        label: "Promotor",
        type: "select",
        reference: "promoters",
      },
      {
        key: "branch_id",
        label: "Sucursal",
        type: "select",
        reference: "branches",
      },
      {
        key: "service_id",
        label: "Estudio",
        type: "select",
        reference: "services",
      },
      { key: "channel", label: "Canal (ej. Facebook, mostrador)" },
      active,
      { key: "archived", label: "Archivado", type: "checkbox" },
    ],
  },
};
export function catalogInput(c: Catalog, form: FormData) {
  const data: Record<string, string | number | boolean | null> = {};
  for (const f of c.fields) {
    const raw = form.get(f.key);
    if (f.type === "checkbox") {
      data[f.key] = raw === "on";
      continue;
    }
    if (raw !== null && typeof raw !== "string")
      throw new Error("Formato inválido.");
    const value = (raw || "").trim();
    if (!value) {
      if (f.required) throw new Error("Completa " + f.label + ".");
      data[f.key] = null;
      continue;
    }
    if (value.length > (f.type === "textarea" ? 2000 : 300))
      throw new Error("El campo " + f.label + " es demasiado largo.");
    if (f.type === "number") {
      if (!f.step && !/^\d+$/.test(value))
        throw new Error("Se requiere un entero.");
      const n = Number(value);
      if (
        !Number.isFinite(n) ||
        (f.min !== undefined && n < f.min) ||
        (f.max !== undefined && n > f.max) ||
        (!f.step && !Number.isInteger(n))
      )
        throw new Error("Revisa " + f.label + ".");
      data[f.key] = n;
    } else {
      if (f.options && !f.options.some(([v]) => v === value))
        throw new Error("Selecciona una opción válida.");
      if (
        f.reference &&
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          value,
        )
      )
        throw new Error("Referencia inválida.");
      if (f.type === "time" && !/^\d{2}:\d{2}(:\d{2})?$/.test(value))
        throw new Error("Hora inválida.");
      if (f.key === "slug" && !/^[a-z0-9-]{2,100}$/.test(value))
        throw new Error(
          "El identificador solo admite minúsculas, números y guiones.",
        );
      if (f.type === "datetime-local") {
        const d = new Date(value + "-06:00");
        if (
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
          !Number.isFinite(d.getTime()) ||
          new Date(d.getTime() - 21600000).toISOString().slice(0, 16) !== value
        )
          throw new Error("Fecha inválida.");
        data[f.key] = d.toISOString();
      } else data[f.key] = value;
    }
  }
  if (c.table === "promo_codes") {
    const code = String(data.code || "").toUpperCase();
    if (!/^[A-Z0-9_-]{3,48}$/.test(code)) throw new Error("Código inválido.");
    data.code = code;
    if (
      data.discount_type === "percentage" &&
      Number(data.discount_value) > 100
    )
      throw new Error("El porcentaje no puede exceder 100.");
    if (data.starts_at && data.ends_at && data.ends_at <= data.starts_at)
      throw new Error("El fin debe ser posterior al inicio.");
  }
  if (data.opens_at && data.closes_at && data.closes_at <= data.opens_at)
    throw new Error("El cierre debe ser posterior a la apertura.");
  return data;
}
