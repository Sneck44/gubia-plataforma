export class ValidationError extends Error {}
function value(form: FormData, key: string, max: number, required = false) {
  const raw = form.get(key);
  if (raw !== null && typeof raw !== "string") throw new ValidationError("Formato inválido.");
  const text = (raw || "").trim();
  if ((required && !text) || text.length > max) throw new ValidationError("Revisa los campos obligatorios y su longitud.");
  return text;
}
function date(form: FormData, key: string) {
  const input = value(form, key, 16);
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) throw new ValidationError("Fecha inválida.");
  const parsed = new Date(input + "-06:00");
  if (!Number.isFinite(parsed.getTime()) || new Date(parsed.getTime() - 6 * 3600000).toISOString().slice(0, 16) !== input) throw new ValidationError("Fecha inválida.");
  return parsed.toISOString();
}
export function campaignInput(form: FormData) {
  const starts_at = date(form, "starts_at");
  const ends_at = date(form, "ends_at");
  if (starts_at && ends_at && ends_at <= starts_at) throw new ValidationError("El fin debe ser posterior al inicio.");
  return { name: value(form, "name", 120, true), description: value(form, "description", 2000) || null, starts_at, ends_at };
}
export function promoInput(form: FormData) {
  const common = campaignInput(form);
  const code = value(form, "code", 48, true).toUpperCase();
  if (!/^[A-Z0-9_-]{3,48}$/.test(code)) throw new ValidationError("El código debe tener entre 3 y 48 letras, números, guiones o guiones bajos.");
  const discount_type = value(form, "discount_type", 16, true);
  const discount_value = Number(value(form, "discount_value", 16, true));
  if (!["percentage", "fixed"].includes(discount_type) || !Number.isFinite(discount_value) || discount_value < 0 || discount_value > 1000000 || (discount_type === "percentage" && discount_value > 100)) throw new ValidationError("Descuento inválido.");
  const rawLimit = value(form, "usage_limit", 10);
  const usage_limit = rawLimit ? Number(rawLimit) : null;
  if (usage_limit !== null && (!/^\d+$/.test(rawLimit) || !Number.isSafeInteger(usage_limit) || usage_limit < 1 || usage_limit > 2147483647)) throw new ValidationError("El límite de usos debe ser un entero positivo.");
  const campaign_id = value(form, "campaign_id", 36) || null;
  if (campaign_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaign_id)) throw new ValidationError("Campaña inválida.");
  return { ...common, code, discount_type, discount_value, usage_limit, campaign_id, status: "active" };
}
