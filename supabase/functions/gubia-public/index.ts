import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const url = Deno.env.get('SUPABASE_URL')!;
const publicKeys: string[] = Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}'));
if (Deno.env.get('SUPABASE_ANON_KEY')) publicKeys.push(Deno.env.get('SUPABASE_ANON_KEY')!);
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const secret = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const token = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret + ':' + value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const errors: Record<string, string> = {
  INVALID_REQUEST: 'Solicitud inválida.', INVALID_CONTACT: 'Revisa tus datos de contacto.',
  PRIVACY_REQUIRED: 'Es necesario aceptar el aviso de privacidad.', SESSION_EXPIRED: 'Vuelve a abrir la agenda.',
  SESSION_ALREADY_BOOKED: 'Esta sesión ya tiene una cita registrada.', BRANCH_UNAVAILABLE: 'Sucursal no disponible.',
  SLOT_UNAVAILABLE: 'El horario ya no está disponible. Elige otro.', PROMO_INVALID: 'La promoción no es aplicable o no está vigente.',
  PROMO_EXHAUSTED: 'La promoción agotó sus usos.', PRICE_REQUIRED_FOR_PROMO: 'Confirma el precio del estudio con la sucursal.',
  QR_UNAVAILABLE: 'El código QR no está disponible.', SERVICE_UNAVAILABLE: 'Estudio no disponible.',
};
Deno.serve(async (req: Request) => {
  // Explicit API-key authentication replaces the gateway JWT check for modern publishable keys.
  // A publishable key only permits the actions below; it never grants arbitrary service-role RPC access.
  if (!publicKeys.includes(req.headers.get('apikey') || '')) return json({ error: 'Acceso inválido.' }, 401);
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  if (Number(req.headers.get('content-length') || 0) > 12000) return json({ error: 'Solicitud demasiado grande.' }, 413);
  try {
    const raw = await req.text();
    if (raw.length > 12000) return json({ error: 'Solicitud demasiado grande.' }, 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Solicitud inválida.' }, 400);
    const action = body.action;
    if (!['slots', 'track', 'book', 'lookup'].includes(action)) return json({ error: 'Acción inválida.' }, 400);
    // IP is an abuse signal, never an identity. CAPTCHA is independently mandatory for bookings.
    const address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { data: allowed, error: limitError } = await db.rpc('gateway_rate_limit', { p_bucket: action + ':' + await hash(address), p_limit: action === 'book' ? 10 : 90, p_seconds: 60 });
    if (limitError || !allowed) return json({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }, 429);
    let result;
    if (action === 'slots') {
      if (!uuid(body.branch_id) || !uuid(body.service_id) || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return json({ error: 'Selecciona sucursal, estudio y fecha.' }, 400);
      result = await db.rpc('gateway_slots', { p_branch: body.branch_id, p_service: body.service_id, p_date: body.date });
    } else if (action === 'track') {
      if (!['qr_scanned','landing_viewed','service_selected','appointment_started'].includes(body.event)) return json({ error: 'Evento inválido.' }, 400);
      if (body.event === 'qr_scanned' && (typeof body.qr !== 'string' || !/^[a-f0-9]{32}$/.test(body.qr))) return json({ error: 'Código inválido.' }, 400);
      if ((body.branch_id && !uuid(body.branch_id)) || (body.service_id && !uuid(body.service_id))) return json({ error: 'Selección inválida.' }, 400);
      result = await db.rpc('gateway_track', { p_token: token(body.session_token) ? body.session_token : null, p_event: body.event, p_qr: body.qr || null, p_branch: body.branch_id || null, p_service: body.service_id || null });
    } else if (action === 'lookup') {
      if (!token(body.management_token) || typeof body.folio !== 'string' || !/^GUB-[A-F0-9]{16}$/.test(body.folio)) return json({ error: 'Cita no disponible.' }, 404);
      result = await db.rpc('gateway_lookup', { p_folio: body.folio, p_token: body.management_token });
      if (!result.error && !result.data) return json({ error: 'Cita no disponible.' }, 404);
    } else {
      const captchaSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
      const hosts = (Deno.env.get('GUBIA_ALLOWED_HOSTNAMES') || '').split(',').map(x => x.trim()).filter(Boolean);
      if (Deno.env.get('GUBIA_BOOKING_ENABLED') !== 'true' || !captchaSecret || !hosts.length) return json({ error: 'La agenda en línea no está disponible. Comunícate con tu sucursal.' }, 503);
      if (typeof body.captcha !== 'string' || body.captcha.length > 2048 || !body.captcha) return json({ error: 'Completa la verificación de seguridad.' }, 400);
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({ secret: captchaSecret, response: body.captcha }), signal: AbortSignal.timeout(10000),
      });
      const verified = await verification.json();
      if (!verified.success || verified.action !== 'book' || !hosts.includes(verified.hostname)) return json({ error: 'La verificación venció. Intenta nuevamente.' }, 400);
      if (!body.payload || typeof body.payload !== 'object' || !token(body.session_token)) return json({ error: 'Solicitud inválida.' }, 400);
      const { data: phoneAllowed, error: phoneLimitError } = await db.rpc('gateway_rate_limit', { p_bucket: 'phone:' + await hash(String(body.payload.phone || '').replace(/[^0-9+]/g,'')), p_limit: 5, p_seconds: 3600 });
      if (phoneLimitError || !phoneAllowed) return json({ error: 'Contacta a la sucursal para registrar otra cita.' }, 429);
      result = await db.rpc('gateway_book', { p_payload: { ...body.payload, session_token: body.session_token } });
    }
    if (result.error) return json({ error: errors[result.error.message] || 'No fue posible completar la solicitud.' }, 400);
    return json({ data: result.data });
  } catch {
    // Never log request bodies, keys, contact data, cookies or management tokens.
    return json({ error: 'No fue posible completar la solicitud. Intenta nuevamente.' }, 400);
  }
});
