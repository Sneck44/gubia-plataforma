import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, isRole, type Permission } from "@/lib/access";

export async function requireStaff(permission?: Permission) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();
  if (error)
    throw new Error(
      "No fue posible verificar los permisos. Intenta nuevamente.",
    );
  if (!profile?.active || !isRole(profile.role))
    redirect(
      "/login?error=" +
        encodeURIComponent("Tu cuenta no tiene acceso administrativo activo."),
    );
  if (permission && !can(profile.role, permission))
    redirect(
      "/admin?error=" +
        encodeURIComponent(
          "Tu cuenta no tiene permiso para realizar esta acción.",
        ),
    );
  return { supabase, profile: { ...profile, role: profile.role }, user };
}
