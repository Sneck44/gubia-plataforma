"use server";
import { requireStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function updateAppointment(form: FormData) {
  const { supabase } = await requireStaff("clinical:write");
  const id = String(form.get("id") || "");
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
      "/admin/citas?error=" +
        encodeURIComponent(
          error.message === "APPOINTMENT_IN_FUTURE"
            ? "La cita todavía no ha ocurrido."
            : "No se pudo cambiar el estado de la cita.",
        ),
    );
  revalidatePath("/admin");
  revalidatePath("/admin/citas");
  redirect("/admin/citas?saved=1");
}
