import { NextResponse } from "next/server";

import { sendPaymentConfirmationEmail } from "@/lib/email";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type PaymentPayload = {
  member_id: string;
  amount: number;
  month: string;
};

const monthRegex = /^\d{4}-\d{2}$/;

const isValidPaymentPayload = (payload: unknown): payload is PaymentPayload => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<PaymentPayload>;
  return (
    typeof candidate.member_id === "string" &&
    candidate.member_id.length > 0 &&
    typeof candidate.amount === "number" &&
    Number.isFinite(candidate.amount) &&
    typeof candidate.month === "string" &&
    monthRegex.test(candidate.month)
  );
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!isValidPaymentPayload(payload)) {
    return NextResponse.json({ error: "Datos de pago inválidos" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("member_id", payload.member_id)
    .eq("month", payload.month)
    .maybeSingle();

  if (existingPaymentError) {
    console.error("Error al verificar pago existente:", existingPaymentError);
    return NextResponse.json({ error: "No se pudo verificar el pago" }, { status: 500 });
  }

  if (existingPayment) {
    return NextResponse.json({ error: "Este mes ya esta pago" }, { status: 409 });
  }

  const { data: payment, error: paymentInsertError } = await supabase
    .from("payments")
    .insert({
      member_id: payload.member_id,
      amount: payload.amount,
      month: payload.month,
    })
    .select("id, member_id, amount, month, paid_at")
    .single();

  if (paymentInsertError) {
    console.error("Error al insertar pago:", paymentInsertError);
    return NextResponse.json({ error: "No se pudo registrar el pago" }, { status: 500 });
  }

  void (async () => {
    const [{ data: member, error: memberError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from("members").select("email, full_name").eq("id", payload.member_id).maybeSingle(),
      supabase.from("club_settings").select("send_payment_confirmation_email").maybeSingle(),
    ]);

    if (memberError) {
      console.error("Error al obtener socio para email:", memberError);
      return;
    }

    if (settingsError && (settingsError as { code?: string }).code !== "PGRST116") {
      console.error("Error al obtener configuración del club:", settingsError);
      return;
    }

    const shouldSendEmail = settings?.send_payment_confirmation_email ?? false;
    const memberEmail = member?.email?.trim();
    const memberName = member?.full_name?.trim();

    if (!shouldSendEmail || !memberEmail || !memberName) {
      return;
    }

    try {
      await sendPaymentConfirmationEmail({
        to: memberEmail,
        name: memberName,
        amount: payload.amount,
        month: payload.month,
      });
    } catch (emailError) {
      console.error("Error al enviar email de confirmación de pago:", emailError);
    }
  })();

  return NextResponse.json({ payment }, { status: 201 });
}
