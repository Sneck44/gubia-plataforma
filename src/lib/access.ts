export type AppRole =
  "superadmin" | "administrador" | "recepcion" | "marketing" | "consulta";
export type Permission =
  | "clinical:read"
  | "clinical:write"
  | "marketing:read"
  | "marketing:write"
  | "catalog:write"
  | "users:manage";
const grants: Record<Permission, readonly AppRole[]> = {
  "clinical:read": ["superadmin", "administrador", "recepcion", "consulta"],
  "clinical:write": ["superadmin", "administrador", "recepcion"],
  "marketing:read": ["superadmin", "administrador", "marketing", "consulta"],
  "marketing:write": ["superadmin", "administrador", "marketing"],
  "catalog:write": ["superadmin", "administrador"],
  "users:manage": ["superadmin"],
};
export function isRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    [
      "superadmin",
      "administrador",
      "recepcion",
      "marketing",
      "consulta",
    ].includes(value)
  );
}
export function can(role: unknown, permission: Permission): boolean {
  return isRole(role) && grants[permission].includes(role);
}
