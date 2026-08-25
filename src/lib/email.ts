import "server-only";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL ?? "Club <onboarding@resend.dev>";

if (!resendApiKey) {
  console.warn("RESEND_API_KEY no estÃ¡ configurada. El envÃ­o de emails quedarÃ¡ deshabilitado.");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

type SendPaymentConfirmationEmailInput = {
  to: string;
  name: string;
  amount: number;
  month: string;
};

type SendPasswordResetEmailInput = {
  to: string;
  name: string;
  resetUrl: string;
  clubName: string;
};

export async function sendPaymentConfirmationEmail({
  to,
  name,
  amount,
  month,
}: SendPaymentConfirmationEmailInput) {
  if (!resend) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  const response = await resend.emails.send({
    from: resendFromEmail,
    to,
    subject: "Pago recibido",
    html: `
      <h2>Pago recibido</h2>
      <p>Hola ${name},</p>
      <p>Recibimos tu pago de <strong>${month}</strong> por <strong>$${amount}</strong>.</p>
      <p>Â¡Gracias por ser parte del club!</p>
    `,
  });

  if (response.error) {
    throw new Error(response.error.message ?? "Resend devolvio un error");
  }
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  clubName,
}: SendPasswordResetEmailInput) {
  if (!resend) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  const response = await resend.emails.send({
    from: resendFromEmail,
    to,
    subject: `Recuperar acceso a ${clubName}`,
    html: `
      <h2>Recuperar acceso</h2>
      <p>Hola ${name},</p>
      <p>Recibimos un pedido para cambiar la contrasena de tu acceso en <strong>${clubName}</strong>.</p>
      <p><a href="${resetUrl}">Crear nueva contrasena</a></p>
      <p>Si no pediste este cambio, podes ignorar este mensaje.</p>
    `,
  });

  if (response.error) {
    throw new Error(response.error.message ?? "Resend devolvio un error");
  }
}
