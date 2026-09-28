import { NextRequest, NextResponse } from "next/server";
import { gateway } from "@/lib/gateway";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token))
    return new NextResponse("Código no disponible.", { status: 404 });
  try {
    const result = await gateway({
      action: "track",
      event: "qr_scanned",
      qr: token,
      session_token: req.cookies.get("gubia_session")?.value || null,
    });
    if (result.error || !result.data?.token)
      return new NextResponse("Este código no está disponible.", {
        status: result.status === 429 ? 429 : 404,
      });
    // Only an internal booking path is supported. Never redirect to caller-provided URLs.
    const response = NextResponse.redirect(new URL("/agendar", req.url), 303);
    response.cookies.set("gubia_session", result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return new NextResponse("Intenta abrir el código nuevamente.", {
      status: 503,
    });
  }
}
