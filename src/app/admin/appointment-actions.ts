"use server";
import { requireStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function updateAppointment(form: FormData) {
  const { supabase } = await requireStaff("clinical:write");
  const id = String(form.get("id") || "");
  const target = form.get("detail") === "1" ? "/admin/citas/" + id : "/admin/citas";
  const status = String(form.get("status") || "");
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      id,
    ) ||
    !["confirmed", "attended", "cancelled", "no_show"].includes(status)
  )
    throw new Error("Solicitud inválida.");
  const raw = String(form.get("revenue") || "");
  const revenue = raw ? Number(raw) : null;
  if (revenue !== null && (!Number.isFinite(revenue) || revenue < 0))
    throw new Error("Ingreso inválido.");
  const { error } = await supabase.rpc("staff_appointment", {
    p_id: id,
    p_status: status,
    p_revenue: revenue,
  });
  if (error)
    redirect(
      target + "?error=" +
        encodeURIComponent(
          error.message === "APPOINTMENT_IN_FUTURE"
            ? "La cita todavía no ha ocurrido."
            : "No se pudo cambiar el estado de la cita.",
        ),
    );
  revalidatePath("/admin");
  revalidatePath("/admin/citas");
  revalidatePath("/admin/agenda");
  revalidatePath(target);
  redirect(target + "?saved=1");
}

export async function checkIn(form:FormData){
 const {supabase}=await requireStaff("clinical:write");const id=String(form.get("id")||"");if(!/^[a-f0-9-]{36}$/i.test(id))throw Error("Cita inválida.");
 const {error}=await supabase.rpc("check_in",{p_id:id});
 revalidatePath("/admin/agenda");revalidatePath("/admin/citas/"+id);
 redirect("/admin/citas/"+id+(error?"?error="+encodeURIComponent("No se pudo registrar la llegada. Debe ser una cita activa de hoy."):"?saved=1"));
}
export async function reschedule(form:FormData){
 const {supabase}=await requireStaff("clinical:write");const id=String(form.get("id")||"");const starts=String(form.get("starts_at")||"");if(!/^[a-f0-9-]{36}$/i.test(id)||!Number.isFinite(Date.parse(starts)))throw Error("Solicitud inválida.");
 const {error}=await supabase.rpc("staff_appointment",{p_id:id,p_starts_at:new Date(starts).toISOString()});
 revalidatePath("/admin/agenda");revalidatePath("/admin/citas/"+id);revalidatePath("/admin/citas");
 redirect("/admin/citas/"+id+(error?"?error="+encodeURIComponent("Ese horario ya no está disponible o no tienes permiso. Consulta nuevamente."):"?saved=1"));
}
