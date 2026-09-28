import "server-only";
export async function gateway(body: Record<string, unknown>) {
  const response = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/gubia-public",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  const result = await response
    .json()
    .catch(() => ({ error: "El servicio no está disponible." }));
  if (!response.ok)
    return {
      error: result.error || "El servicio no está disponible.",
      status: response.status,
    };
  return { data: result.data, status: 200 };
}
