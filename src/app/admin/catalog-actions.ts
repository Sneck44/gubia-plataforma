"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { catalogs, catalogInput } from "@/lib/catalogs";
export async function saveCatalog(form: FormData) {
  const key = String(form.get("catalog") || "");
  const c = Object.hasOwn(catalogs, key) ? catalogs[key] : null;
  if (!c) throw new Error("Sección inválida.");
  const { supabase } = await requireStaff(c.write);
  let data: ReturnType<typeof catalogInput>;
  try {
    data = catalogInput(c, form);
  } catch (e) {
    redirect(
      "/admin/" + key + "?error=" + encodeURIComponent((e as Error).message),
    );
  }
  const id = String(form.get("id") || "");
  if (
    id &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    throw new Error("Registro inválido.");
  let query;
  if (c.composite)
    query = supabase.from(c.table).upsert(data, { onConflict: c.composite });
  else if (id) query = supabase.from(c.table).update(data).eq("id", id);
  else query = supabase.from(c.table).insert(data);
  const { error } = await query;
  if (error)
    redirect(
      "/admin/" +
        key +
        "?error=" +
        encodeURIComponent(
          error.code === "23505"
            ? "Ya existe un registro con ese identificador."
            : "No se pudo guardar. Revisa los campos y vuelve a intentar.",
        ),
    );
  revalidatePath("/admin/" + key);
  redirect("/admin/" + key + "?saved=1");
}
export async function duplicateQR(form: FormData) {
  const { supabase, user } = await requireStaff("marketing:write");
  const id = String(form.get("id") || "");
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    throw new Error("Registro inválido.");
  const { data, error } = await supabase
    .from("qr_codes")
    .select(
      "name,kind,promo_code_id,campaign_id,promoter_id,branch_id,service_id,channel,destination",
    )
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Código no disponible.");
  const result = await supabase
    .from("qr_codes")
    .insert({
      ...data,
      name: data.name + " (copia)",
      created_by: user.id,
      active: false,
    });
  if (result.error) throw new Error("No se pudo duplicar.");
  revalidatePath("/admin/qr");
  redirect("/admin/qr?saved=1");
}
