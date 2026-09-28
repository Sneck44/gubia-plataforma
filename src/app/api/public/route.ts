import { NextRequest, NextResponse } from "next/server";
import { gateway } from "@/lib/gateway";
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 403 });
  try {
    const raw = await req.text();
    if (raw.length > 12000)
      return NextResponse.json(
        { error: "Solicitud demasiado grande." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    if (!["slots", "track", "book", "lookup"].includes(body.action))
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 },
      );
    if (body.action === "track" && body.event === "qr_scanned")
      return NextResponse.json(
        { error: "Usa el enlace del QR." },
        { status: 400 },
      );
    const result = await gateway({
      ...body,
      session_token: req.cookies.get("gubia_session")?.value || null,
    });
    const data = result.data;
    const response = NextResponse.json(
      result.error
        ? { error: result.error }
        : {
            data:
              body.action === "track"
                ? { branch_id: data.branch_id, service_id: data.service_id }
                : data,
          },
      {
        status: result.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
    if (body.action === "track" && data?.token)
      response.cookies.set("gubia_session", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 2592000,
      });
    if (
      body.action === "book" &&
      data?.folio &&
      /^[a-f0-9]{64}$/.test(body.payload?.management_token || "")
    )
      response.cookies.set(
        "gubia_manage_" + data.folio,
        body.payload.management_token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 2592000,
        },
      );
    return response;
  } catch {
    return NextResponse.json(
      { error: "El servicio no está disponible. Intenta nuevamente." },
      { status: 503 },
    );
  }
}
