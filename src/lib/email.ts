import "server-only";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("RESEND_API_KEY no está configurada. El envío de emails quedará deshabilitado.");
}

const resend = new Resend(resendApiKey);

type SendPaymentConfirmationEmailInput = {
  to: string;
  name: string;
  amount: number;
  month: string;
};

export async function sendPaymentConfirmationEmail({
  to,
  name,
  amount,
  month,
}: SendPaymentConfirmationEmailInput) {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  await resend.emails.send({
    from: "Club <onboarding@resend.dev>",
    to,
    subject: "Pago recibido",
    html: `
      <h2>Pago recibido</h2>
      <p>Hola ${name},</p>
      <p>Recibimos tu pago de <strong>${month}</strong> por <strong>$${amount}</strong>.</p>
      <p>¡Gracias por ser parte del club!</p>
    `,
  });
}
