"use client";

import {
  CheckCircle2,
  CreditCard,
  FileUp,
  History,
  Clock3,
  LogOut,
  Receipt,
  UserRound,
  XCircle,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ClubLogo } from "@/components/club-logo";
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Select, Table, TableBody, TableContainer, TableHead, TableRow, Td, Th, buttonClassNames } from "@/components/ui";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import {
  CLUB_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PAYMENT_METHOD,
  paymentMethodLabel,
  type ClubPaymentMethod,
} from "@/config/payment-method";
import {
  collectionAccountLabel,
  formatBillingPeriod,
  getChargePaymentsByMemberChargeId,
  getMemberChargesForMember,
  isMembershipCategory,
  type ChargePaymentRow,
  type MemberChargeWithDetails,
} from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import {
  createPaymentSubmission,
  listPaymentSubmissionsForMember,
  PAYMENT_PROOF_ACCEPT,
  uploadPaymentProof,
  validatePaymentProofFile,
  type PaymentSubmissionWithContext,
} from "@/lib/payment-submissions";
import { getCurrentUserProfile, getMemberById } from "@/lib/supabase";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useClubRoutes } from "@/lib/use-club-routes";
import { memberLoginPath } from "@/lib/routes";
import type { Member } from "@/types";

type PaymentHistoryRow = ChargePaymentRow & {
  conceptName: string;
  category: string | null;
  billing_period: string | null;
};

type SubmissionForm = {
  member_charge_id: string;
  amount: string;
  paid_at: string;
  payment_method: ClubPaymentMethod;
  notes: string;
  proof: File | null;
};

const todayInput = () => new Date().toISOString().slice(0, 10);

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function pendingAmount(charge: MemberChargeWithDetails) {
  return Math.max(0, roundMoney(charge.amount - charge.paid_amount));
}

function paymentSubmissionsTotal(submissions: PaymentSubmissionWithContext[]) {
  return roundMoney(
    submissions
      .filter((submission) => submission.status === "pending")
      .reduce((sum, submission) => sum + submission.amount, 0)
  );
}

function statusLabel(status: string) {
  if (status === "approved") return "Aprobado";
  if (status === "rejected") return "Rechazado";
  return "En revision";
}

function submissionStatusVariant(status: string): "success" | "warning" | "danger" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

function chargeStatusVariant(status: string): "success" | "info" | "warning" | "danger" {
  if (status === "Pagado") return "success";
  if (status === "Parcial") return "info";
  if (status === "En revision") return "warning";
  return "danger";
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-AR");
}

function formatDateTime(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function conceptLabel(charge: MemberChargeWithDetails) {
  if (isMembershipCategory(charge.category) && charge.billing_period) {
    return `Cuota mensual - ${formatBillingPeriod(charge.billing_period)}`;
  }
  return charge.conceptName;
}

export default function MemberPortalPage() {
  const { config, isConfigLoading } = useActiveClubConfig();
  const routes = useClubRoutes();
  const router = useRouter();

  const [member, setMember] = useState<Member | null>(null);
  const [charges, setCharges] = useState<MemberChargeWithDetails[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmissionWithContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<SubmissionForm>({
    member_charge_id: "",
    amount: "",
    paid_at: todayInput(),
    payment_method: DEFAULT_PAYMENT_METHOD,
    notes: "",
    proof: null,
  });

  const load = useCallback(async () => {
    setErrorMessage(null);
    setMessage(null);
    setIsLoading(true);
    try {
      const profile = await getCurrentUserProfile();
      if (!profile?.member_id) {
        router.replace(memberLoginPath(routes.slug));
        return;
      }

      const memberData = await getMemberById(profile.member_id);
      if (!memberData) {
        setErrorMessage("No encontramos tu ficha de socio.");
        return;
      }

      setMember(memberData);

      if (memberData.status !== "active") {
        setCharges([]);
        setPayments([]);
        setSubmissions([]);
        return;
      }

      const [chargeRows, submissionRows] = await Promise.all([
        getMemberChargesForMember(profile.member_id),
        listPaymentSubmissionsForMember(profile.member_id),
      ]);

      const paymentRows = (
        await Promise.all(
          chargeRows.map(async (charge) => {
            const rows = await getChargePaymentsByMemberChargeId(charge.id);
            return rows.map((payment) => ({
              ...payment,
              conceptName: conceptLabel(charge),
              category: charge.category,
              billing_period: charge.billing_period,
            }));
          })
        )
      )
        .flat()
        .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());

      setCharges(chargeRows);
      setPayments(paymentRows);
      setSubmissions(submissionRows);

      const chargeIdsInReview = new Set(
        submissionRows
          .filter((submission) => submission.status === "pending" && submission.member_charge_id)
          .map((submission) => submission.member_charge_id)
      );
      const firstPending = chargeRows.find(
        (charge) => pendingAmount(charge) > 0.001 && !chargeIdsInReview.has(charge.id)
      );
      if (firstPending) {
        setForm((prev) => ({
          ...prev,
          member_charge_id:
            prev.member_charge_id && !chargeIdsInReview.has(prev.member_charge_id)
              ? prev.member_charge_id
              : firstPending.id,
          amount:
            prev.member_charge_id && !chargeIdsInReview.has(prev.member_charge_id)
              ? prev.amount
              : String(pendingAmount(firstPending)),
        }));
      } else {
        setForm((prev) => ({ ...prev, member_charge_id: "", amount: "" }));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar tu portal.");
    } finally {
      setIsLoading(false);
    }
  }, [router, routes]);

  useEffect(() => {
    void load();
  }, [load]);

  const membershipCharges = useMemo(() => charges.filter((charge) => isMembershipCategory(charge.category)), [charges]);
  const otherCharges = useMemo(() => charges.filter((charge) => !isMembershipCategory(charge.category)), [charges]);
  const pendingCharges = useMemo(() => charges.filter((charge) => pendingAmount(charge) > 0.001), [charges]);
  const chargeIdsInReview = useMemo(
    () =>
      new Set(
        submissions
          .filter((submission) => submission.status === "pending" && submission.member_charge_id)
          .map((submission) => submission.member_charge_id)
      ),
    [submissions]
  );
  const actionablePendingCharges = useMemo(
    () => pendingCharges.filter((charge) => !chargeIdsInReview.has(charge.id)),
    [chargeIdsInReview, pendingCharges]
  );
  const amountInReview = useMemo(() => paymentSubmissionsTotal(submissions), [submissions]);

  const totalDebt = useMemo(
    () => roundMoney(charges.reduce((sum, charge) => sum + pendingAmount(charge), 0)),
    [charges]
  );

  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const currentMembershipDebt = useMemo(
    () =>
      roundMoney(
        membershipCharges
          .filter((charge) => {
            if (!charge.billing_period) return false;
            return new Date(`${charge.billing_period}T12:00:00`).getTime() === currentMonthStart.getTime();
          })
          .reduce((sum, charge) => sum + pendingAmount(charge), 0)
      ),
    [currentMonthStart, membershipCharges]
  );

  const overdueMembershipDebt = useMemo(
    () =>
      roundMoney(
        membershipCharges
          .filter((charge) => {
            if (!charge.billing_period) return false;
            return new Date(`${charge.billing_period}T12:00:00`) < currentMonthStart;
          })
          .reduce((sum, charge) => sum + pendingAmount(charge), 0)
      ),
    [currentMonthStart, membershipCharges]
  );

  const statusCopy =
    totalDebt <= 0.001
      ? "Al dia"
      : overdueMembershipDebt > 0.001
        ? "Tiene deuda vencida"
        : currentMembershipDebt > 0.001
          ? "Debe mes actual"
          : "Tiene cargos pendientes";

  const selectedCharge = useMemo(
    () => actionablePendingCharges.find((charge) => charge.id === form.member_charge_id) ?? null,
    [actionablePendingCharges, form.member_charge_id]
  );
  const selectedPaymentAccount = selectedCharge?.charge.collection_account ?? null;
  const selectedPaymentAlias = selectedPaymentAccount?.alias?.trim() || config.payment_alias;
  const selectedPaymentAccountName = selectedPaymentAccount
    ? collectionAccountLabel(selectedPaymentAccount)
    : "Alias del club";
  const selectedPaymentIsExternal = selectedPaymentAccount?.kind === "external";

  const handleChargeChange = (memberChargeId: string) => {
    const charge = actionablePendingCharges.find((row) => row.id === memberChargeId);
    setForm((prev) => ({
      ...prev,
      member_charge_id: memberChargeId,
      amount: charge ? String(pendingAmount(charge)) : prev.amount,
    }));
  };

  const handleProofChange = (file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, proof: null }));
      return;
    }

    try {
      validatePaymentProofFile(file);
      setErrorMessage(null);
      setForm((prev) => ({ ...prev, proof: file }));
    } catch (error) {
      setForm((prev) => ({ ...prev, proof: null }));
      setErrorMessage(error instanceof Error ? error.message : "El comprobante no es valido.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!member) return;
    if (!selectedCharge) {
      setErrorMessage("Elegi una cuota pendiente que no tenga comprobante en revision.");
      return;
    }
    if (!form.proof) {
      setErrorMessage("Subi el comprobante para enviar el pago a revision.");
      return;
    }
    const submittedAmount = roundMoney(Number(form.amount));
    const selectedPending = pendingAmount(selectedCharge);
    if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
      setErrorMessage("Ingresa un monto mayor a cero.");
      return;
    }
    if (submittedAmount - selectedPending > 0.001) {
      setErrorMessage(`El monto no puede superar el saldo pendiente (${formatMoney(selectedPending)}).`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const proofPath = await uploadPaymentProof(member.id, form.proof);
      await createPaymentSubmission({
        member_id: member.id,
        member_charge_id: form.member_charge_id,
        amount: submittedAmount,
        payment_method: form.payment_method,
        paid_at: new Date(`${form.paid_at}T12:00:00`).toISOString(),
        proof_url: proofPath,
        notes: form.notes,
      });
      setMessage("Comprobante enviado. Tesoreria lo revisara antes de registrar el pago.");
      setForm({
        member_charge_id: "",
        amount: "",
        paid_at: todayInput(),
        payment_method: DEFAULT_PAYMENT_METHOD,
        notes: "",
        proof: null,
      });
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar el comprobante.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    router.replace(memberLoginPath(routes.slug));
    router.refresh();
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-5">
        <Card className="mx-auto max-w-5xl p-6">
          <p className="text-sm text-slate-600">Cargando tu portal...</p>
        </Card>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-slate-50 p-5">
        <Card className="mx-auto max-w-5xl p-6">
          <Alert variant="danger">{errorMessage ?? "No pudimos abrir tu portal de socio."}</Alert>
        </Card>
      </main>
    );
  }

  if (member.status !== "active") {
    const isPending = member.status === "pending";
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex min-w-0 items-center gap-4">
              <ClubLogo
                src={config.logo}
                alt={isConfigLoading ? "Logo del club" : `Logo de ${config.name}`}
                className="h-14 w-14 shrink-0 rounded-xl bg-white p-1.5 shadow-sm"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">Portal del socio</p>
                <h1 className="break-words text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                  {member.full_name}
                </h1>
                <p className="mt-1 text-sm text-slate-600">DNI {member.dni}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className={buttonClassNames({ variant: "neutral", size: "md" })}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Salir
            </button>
          </header>

          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {isPending ? "Solicitud pendiente" : "Acceso no disponible"}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {isPending ? "Tu alta todavia esta en revision." : "Tu socio figura dado de baja."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isPending
                ? "El club ya recibio tus datos. Cuando administracion apruebe la solicitud, vas a poder ver cuotas, pagos y enviar comprobantes desde este portal."
                : "Si crees que es un error, comunicate con el club para revisar tu estado."}
            </p>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-950">Datos registrados</h2>
            </div>
            <div className="grid gap-3 text-sm">
              <ProfileRow label="Email" value={member.email || "-"} />
              <ProfileRow label="Telefono" value={member.phone || "-"} />
              <ProfileRow label="Direccion" value={member.address || "-"} />
              <ProfileRow label="Localidad" value={member.city || "-"} />
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex min-w-0 items-center gap-4">
            <ClubLogo
              src={config.logo}
              alt={isConfigLoading ? "Logo del club" : `Logo de ${config.name}`}
              className="h-14 w-14 shrink-0 rounded-xl bg-white p-1.5 shadow-sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">Portal del socio</p>
              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                {member.full_name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                DNI {member.dni} - {isConfigLoading ? "Club" : config.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={buttonClassNames({ variant: "neutral", size: "md" })}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Salir
          </button>
        </header>

        {message ? <Alert variant="success">{message}</Alert> : null}
        {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

        <section className="grid gap-3 md:grid-cols-3">
          <Card className={`p-5 ${totalDebt > 0.001 ? "border-danger/25 bg-danger/5" : ""}`}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mi estado</p>
            <p className={`mt-2 text-2xl font-bold ${totalDebt > 0.001 ? "text-danger" : "text-success"}`}>
              {statusCopy}
            </p>
            <p className="mt-1 text-sm text-slate-600">Deuda total: {formatMoney(totalDebt)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Mes actual</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{formatMoney(currentMembershipDebt)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {config.monthly_due_day ? `Vence el dia ${config.monthly_due_day}.` : "Vencimiento a confirmar."}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Como pagar</p>
            <p className="mt-2 break-words text-lg font-bold text-slate-950">
              {selectedPaymentAlias || "Alias pendiente"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{selectedPaymentAccountName}</p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedPaymentIsExternal
                ? "Esta lista usa una cuenta externa. Subi el comprobante para que el responsable lo revise."
                : "Subi el comprobante para que tesoreria lo revise."}
            </p>
            {amountInReview > 0.001 ? (
              <p className="mt-2 text-sm font-semibold text-primary">
                En revision: {formatMoney(amountInReview)}
              </p>
            ) : null}
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileUp className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-950">Enviar comprobante</h2>
            </div>
            {actionablePendingCharges.length === 0 ? (
              <EmptyState
                title={amountInReview > 0.001 ? "No quedan cuotas disponibles para enviar" : "No tenes pagos pendientes"}
                description={
                  amountInReview > 0.001
                    ? "Las cuotas con comprobante pendiente quedan en revision hasta que tesoreria las apruebe o rechace."
                    : "Cuando haya una cuota o cobro pendiente, vas a poder enviar el comprobante desde aca."
                }
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField htmlFor="member_charge_id" label="Cuota o cobro">
                  <Select
                    id="member_charge_id"
                    value={form.member_charge_id}
                    onChange={(event) => handleChargeChange(event.target.value)}
                    required
                    disabled={isSaving}
                  >
                    <option value="">Elegir concepto</option>
                    {actionablePendingCharges.map((charge) => (
                      <option key={charge.id} value={charge.id}>
                        {conceptLabel(charge)} - pendiente {formatMoney(pendingAmount(charge))} -{" "}
                        {collectionAccountLabel(charge.charge.collection_account)}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField htmlFor="amount" label="Monto transferido">
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                      required
                      disabled={isSaving}
                    />
                  </FormField>
                  <FormField htmlFor="paid_at" label="Fecha de pago">
                    <Input
                      id="paid_at"
                      type="date"
                      value={form.paid_at}
                      onChange={(event) => setForm((prev) => ({ ...prev, paid_at: event.target.value }))}
                      required
                      disabled={isSaving}
                    />
                  </FormField>
                </div>

                <FormField htmlFor="payment_method" label="Medio de pago">
                  <Select
                    id="payment_method"
                    value={form.payment_method}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, payment_method: event.target.value as ClubPaymentMethod }))
                    }
                    disabled={isSaving}
                  >
                    {CLUB_PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField htmlFor="proof" label="Comprobante">
                  <Input
                    id="proof"
                    type="file"
                    accept={PAYMENT_PROOF_ACCEPT}
                    onChange={(event) => handleProofChange(event.target.files?.[0] ?? null)}
                    required
                    disabled={isSaving}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Formatos permitidos: JPG, PNG, WebP o PDF. Tamaño maximo: 10 MB.
                  </p>
                </FormField>

                <FormField htmlFor="notes" label="Nota para tesoreria">
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    disabled={isSaving}
                    placeholder={selectedCharge ? `Pago de ${conceptLabel(selectedCharge)}` : "Opcional"}
                  />
                </FormField>

                <Button type="submit" variant="primary" size="lg" disabled={isSaving} fullWidth>
                  {isSaving ? "Enviando..." : "Enviar a revision"}
                </Button>
              </form>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-950">Mi perfil</h2>
            </div>
            <div className="grid gap-3 text-sm">
              <ProfileRow label="Email" value={member.email || "-"} />
              <ProfileRow label="Telefono" value={member.phone || "-"} />
              <ProfileRow label="Direccion" value={member.address || "-"} />
              <ProfileRow label="Localidad" value={member.city || "-"} />
              <ProfileRow label="Estado" value={member.status === "active" ? "Activo" : member.status === "inactive" ? "Baja" : "Pendiente"} />
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DataCard icon={<Receipt className="h-4 w-4 text-primary" />} title="Cuotas y cobros">
            {charges.length === 0 ? (
              <EmptyState title="Sin cobros" description="Todavia no tenes cuotas o cobros asignados." />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <Th>Concepto</Th>
                      <Th>Vence</Th>
                      <Th>Saldo</Th>
                      <Th>Cuenta</Th>
                      <Th>Estado</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...membershipCharges, ...otherCharges].map((charge) => {
                      const isInReview = chargeIdsInReview.has(charge.id);
                      const status =
                        charge.status === "paid"
                          ? "Pagado"
                          : charge.status === "partial"
                            ? "Parcial"
                            : isInReview
                              ? "En revision"
                              : "Pendiente";

                      return (
                      <TableRow key={charge.id}>
                        <Td className="font-medium text-slate-950">{conceptLabel(charge)}</Td>
                        <Td>{charge.dueDate || "-"}</Td>
                        <Td>{formatMoney(pendingAmount(charge))}</Td>
                        <Td className="text-sm text-slate-600">
                          {collectionAccountLabel(charge.charge.collection_account)}
                        </Td>
                        <Td>
                          <Badge variant={chargeStatusVariant(status)}>{status}</Badge>
                        </Td>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataCard>

          <DataCard icon={<History className="h-4 w-4 text-primary" />} title="Historial de pagos">
            {payments.length === 0 ? (
              <EmptyState title="Sin pagos registrados" description="Cuando tesoreria apruebe o cargue pagos, van a aparecer aca." />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <Th>Fecha</Th>
                      <Th>Concepto</Th>
                      <Th>Monto</Th>
                      <Th>Medio</Th>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <Td>{formatDate(payment.paid_at)}</Td>
                        <Td className="font-medium text-slate-950">{payment.conceptName}</Td>
                        <Td>{formatMoney(payment.amount)}</Td>
                        <Td>{paymentMethodLabel(payment.payment_method)}</Td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataCard>
        </section>

        <DataCard icon={<CreditCard className="h-4 w-4 text-primary" />} title="Comprobantes enviados">
          {submissions.length === 0 ? (
            <EmptyState title="Sin comprobantes enviados" description="Los comprobantes que mandes para revision se listan en esta seccion." />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <Th>Enviado</Th>
                    <Th>Concepto</Th>
                    <Th>Monto</Th>
                    <Th>Cuenta</Th>
                    <Th>Estado</Th>
                    <Th>Detalle</Th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <Td>{formatDateTime(submission.created_at)}</Td>
                      <Td className="font-medium text-slate-950">
                        {submission.member_charge?.charge?.name || "Pago enviado"}
                      </Td>
                      <Td>{formatMoney(submission.amount)}</Td>
                      <Td>{collectionAccountLabel(submission.collection_account)}</Td>
                      <Td>
                        <Badge variant={submissionStatusVariant(submission.status)} className="gap-1">
                          {submission.status === "approved" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : submission.status === "rejected" ? (
                            <XCircle className="h-3.5 w-3.5 text-danger" />
                          ) : (
                            <Clock3 className="h-3.5 w-3.5 text-warning" />
                          )}
                          {statusLabel(submission.status)}
                        </Badge>
                      </Td>
                      <Td>{submission.rejection_reason || submission.notes || "-"}</Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataCard>
      </div>
    </main>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function DataCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </Card>
  );
}
