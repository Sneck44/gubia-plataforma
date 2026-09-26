"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { campaignInput, promoInput, ValidationError } from "@/lib/promo-validation";

function invalid(error: unknown): never {
  redirect("/admin/codigos?error=" + encodeURIComponent(error instanceof ValidationError ? error.message : "No se pudo guardar. Intenta nuevamente."));
}
export async function createPromo(form: FormData) {
  const { supabase } = await requireStaff("marketing:write");
  let input: ReturnType<typeof promoInput>;
  try { input = promoInput(form); } catch (error) { invalid(error); }
  const { error } = await supabase.from("promo_codes").insert(input);
  if (error) redirect("/admin/codigos?error=" + encodeURIComponent(error.code === "23505" ? "El código ya existe." : "No se pudo guardar la promoción."));
  revalidatePath("/admin/codigos");
  redirect("/admin/codigos?saved=1");
}
export async function createCampaign(form: FormData) {
  const { supabase } = await requireStaff("marketing:write");
  let input: ReturnType<typeof campaignInput>;
  try { input = campaignInput(form); } catch (error) { invalid(error); }
  const { error } = await supabase.from("campaigns").insert({ ...input, active: true });
  if (error) redirect("/admin/codigos?error=" + encodeURIComponent("No se pudo guardar la campaña."));
  revalidatePath("/admin/codigos");
  redirect("/admin/codigos?saved=1");
}
