import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const testFromEmail = "Club <onboarding@resend.dev>";

export async function GET() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const to = process.env.RESEND_TEST_TO_EMAIL;

  if (!resendApiKey) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY no configurada" },
      { status: 500 }
    );
  }

  if (!to) {
    return NextResponse.json(
      { ok: false, error: "RESEND_TEST_TO_EMAIL no configurada" },
      { status: 400 }
    );
  }

  const resend = new Resend(resendApiKey);

  const response = await resend.emails.send({
    from: testFromEmail,
    to,
    subject: "Test real",
    html: "<p>Test</p>",
  });

  console.info("RESEND RESPONSE:", response);

  if (response.error) {
    return NextResponse.json(
      {
        ok: false,
        error: response.error.message ?? "Resend devolvio un error",
        details: response.error,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, to, from: testFromEmail, response });
}
