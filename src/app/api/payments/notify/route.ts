import { NextResponse, type NextRequest } from "next/server";

import { sendPaymentConfirmationEmail } from "@/lib/email";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

function formatMonthLabel(billingPeriod: string | null, fallback: string): string {
  if (!billingPeriod) {
    return fallback;
  }
  // billing_period llega como "YYYY-MM-DD". Lo parseamos en UTC para evitar
  // saltos de mes según la TZ del runtime.
  const parsed = new Date(`${billingPeriod}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  const formatted = monthFormatter.format(parsed);
  // Capitalizar primer caracter ("agosto 2026" → "Agosto 2026").
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * POST /api/payments/notify
 * Body: { member_charge_id: string, amount: number }
 *
 * - Verifica que haya sesión admin (cookies). Si no, 401.
 * - Lee el flag club_settings.send_payment_confirmation_email.
 * - Si está apagado o el socio no tiene email, devuelve `{ ok: true, sent: false }`.
 * - Si está prendido y hay email, envía vía Resend.
 * - Cualquier error de email se reporta pero no se debe usar para bloquear el
 *   pago: el caller debe llamar a este endpoint *después* de que la RPC
 *   `register_charge_payment` haya resuelto OK.
 */
export async function POST(request: NextRequest) {
  type Body = { member_charge_id?: string; amount?: number };
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  const memberChargeId = body.member_charge_id?.trim();
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);

  if (!memberChargeId) {
    return NextResponse.json(
      { ok: false, error: "member_charge_id requerido" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "amount inválido" },
      { status: 400 }
    );
  }

  const supabase = await getServerSupabase();

  // Sólo admins logueados pueden gatillar el envío.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const [{ data: settingsRow }, { data: chargeRow, error: chargeError }] = await Promise.all([
    supabase
      .from("club_settings")
      .select("send_payment_confirmation_email")
      .single(),
    supabase
      .from("member_charges")
      .select(
        `
        id,
        member:members(full_name, email),
        charge:charges(name, billing_period)
      `
      )
      .eq("id", memberChargeId)
      .maybeSingle(),
  ]);

  if (chargeError) {
    return NextResponse.json(
      { ok: false, error: chargeError.message },
      { status: 500 }
    );
  }

  if (!chargeRow) {
    return NextResponse.json(
      { ok: false, error: "member_charge no encontrado" },
      { status: 404 }
    );
  }

  const flag = settingsRow?.send_payment_confirmation_email === true;
  if (!flag) {
    return NextResponse.json({ ok: true, sent: false, reason: "flag_off" });
  }

  // Supabase devuelve relaciones como objeto o array dependiendo de la cardinalidad.
  type RelObj<T> = T | T[] | null;
  const member = (Array.isArray(chargeRow.member) ? chargeRow.member[0] : chargeRow.member) as
    | { full_name?: string | null; email?: string | null }
    | null;
  const charge = (Array.isArray(chargeRow.charge) ? chargeRow.charge[0] : chargeRow.charge) as
    | { name?: string | null; billing_period?: string | null }
    | null;
  void ({} as RelObj<unknown>);

  const email = member?.email?.trim() || null;
  if (!email) {
    return NextResponse.json({ ok: true, sent: false, reason: "no_email" });
  }

  const name = member?.full_name?.trim() || "socio";
  const fallbackLabel = charge?.name?.trim() || "este cargo";
  const monthLabel = formatMonthLabel(charge?.billing_period ?? null, fallbackLabel);

  try {
    await sendPaymentConfirmationEmail({
      to: email,
      name,
      amount,
      month: monthLabel,
    });
    return NextResponse.json({ ok: true, sent: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error enviando email";
    console.error("payments/notify: email failed", e);
    return NextResponse.json({ ok: false, sent: false, error: msg }, { status: 502 });
  }
}
