"use client";

import { CheckCircle2, ExternalLink, ReceiptText, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Td,
  Th,
  buttonClassNames,
} from "@/components/ui";
import { paymentMethodLabel } from "@/config/payment-method";
import { collectionAccountLabel, formatBillingPeriod } from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import {
  approvePaymentSubmission,
  getPaymentProofSignedUrl,
  listPaymentSubmissions,
  rejectPaymentSubmission,
  type PaymentSubmissionWithContext,
} from "@/lib/payment-submissions";
import { getCurrentUserProfile, type UserProfile } from "@/lib/supabase";
import type { PaymentSubmissionStatus } from "@/types";

type StatusFilter = PaymentSubmissionStatus | "all";
type ScopeFilter = "all" | "membership" | "lists" | "mine";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function submissionConcept(row: PaymentSubmissionWithContext) {
  const charge = row.member_charge?.charge;
  if (!charge) return "Pago enviado";
  if (charge.charge_definition?.category === "membership" && charge.billing_period) {
    return `Cuota mensual - ${formatBillingPeriod(charge.billing_period)}`;
  }
  return charge.name || "Pago enviado";
}

function statusLabel(status: PaymentSubmissionStatus) {
  if (status === "approved") return "Aprobado";
  if (status === "rejected") return "Rechazado";
  return "Pendiente";
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentSubmissionWithContext[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PaymentSubmissionWithContext | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [submissionRows, profile] = await Promise.all([
        listPaymentSubmissions(statusFilter),
        getCurrentUserProfile(),
      ]);
      setRows(submissionRows);
      setCurrentProfile(profile);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los comprobantes.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const category = row.member_charge?.charge?.charge_definition?.category ?? null;
      const isMembership = category === "membership";
      if (scopeFilter === "membership") return isMembership;
      if (scopeFilter === "lists") return !isMembership;
      if (scopeFilter === "mine") {
        return Boolean(
          currentProfile?.id &&
            row.collection_account?.kind === "external" &&
            row.collection_account.responsible_profile_id === currentProfile.id
        );
      }
      return true;
    });
  }, [currentProfile, rows, scopeFilter]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc[row.status] += 1;
        if (row.status === "pending") {
          acc.pendingAmount += row.amount;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, pendingAmount: 0 }
    );
  }, [filteredRows]);

  const openProof = async (row: PaymentSubmissionWithContext) => {
    setActionId(row.id);
    setErrorMessage(null);
    try {
      const url = await getPaymentProofSignedUrl(row.proof_url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo abrir el comprobante.");
    } finally {
      setActionId(null);
    }
  };

  const approve = async (row: PaymentSubmissionWithContext) => {
    const ok = window.confirm(`Aprobar el pago de ${row.member?.full_name ?? "este socio"} por ${formatMoney(row.amount)}?`);
    if (!ok) return;

    setActionId(row.id);
    setMessage(null);
    setErrorMessage(null);
    try {
      await approvePaymentSubmission(row.id);
      setMessage("Comprobante aprobado y pago registrado.");
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo aprobar el comprobante.");
    } finally {
      setActionId(null);
    }
  };

  const reject = async () => {
    if (!rejecting) return;

    setActionId(rejecting.id);
    setMessage(null);
    setErrorMessage(null);
    try {
      await rejectPaymentSubmission(rejecting.id, rejectReason);
      setMessage("Comprobante rechazado.");
      setRejecting(null);
      setRejectReason("");
      await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo rechazar el comprobante.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Tesoreria"
        title="Pagos enviados"
        description="Comprobantes cargados por socios para revisar contra la cuenta destino de cada cuota o lista."
        actions={
          <div className="flex flex-wrap gap-2">
            <Select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
              aria-label="Filtrar por cuenta o tipo"
            >
              <option value="all">Todos</option>
              <option value="membership">Cuotas</option>
              <option value="lists">Listas</option>
              <option value="mine">Mis cuentas</option>
            </Select>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filtrar comprobantes por estado"
            >
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
              <option value="all">Todos</option>
            </Select>
          </div>
        }
      />

      {message ? <Alert variant="success">{message}</Alert> : null}
      {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Pendientes" value={summary.pending} />
        <SummaryCard label="Monto pendiente" value={formatMoney(summary.pendingAmount)} />
        <SummaryCard label="Aprobados" value={summary.approved} />
        <SummaryCard label="Rechazados" value={summary.rejected} />
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Cargando comprobantes...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <EmptyState title="No hay comprobantes para este filtro" description="Cuando un socio envie un pago, va a aparecer en esta bandeja." />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Enviado</Th>
                <Th>Socio</Th>
                <Th>Concepto</Th>
                <Th>Cuenta</Th>
                <Th>Monto</Th>
                <Th>Medio</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <Td>{formatDateTime(row.created_at)}</Td>
                  <Td>
                    <p className="font-semibold text-slate-950">{row.member?.full_name ?? "Socio"}</p>
                    <p className="text-xs text-slate-500">DNI {row.member?.dni ?? "-"}</p>
                  </Td>
                  <Td>{submissionConcept(row)}</Td>
                  <Td>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{collectionAccountLabel(row.collection_account)}</p>
                      {row.collection_account?.kind === "external" ? (
                        <Badge variant="warning">Externa</Badge>
                      ) : (
                        <Badge variant="success">Club</Badge>
                      )}
                    </div>
                  </Td>
                  <Td>{formatMoney(row.amount)}</Td>
                  <Td>{paymentMethodLabel(row.payment_method)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {row.status === "approved" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : row.status === "rejected" ? (
                        <XCircle className="h-3.5 w-3.5 text-danger" />
                      ) : (
                        <ReceiptText className="h-3.5 w-3.5 text-primary" />
                      )}
                      {statusLabel(row.status)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void openProof(row)}
                        disabled={actionId === row.id}
                        className={buttonClassNames({ variant: "neutral", size: "sm" })}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        Ver
                      </button>
                      {row.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void approve(row)}
                            disabled={actionId === row.id}
                            className={buttonClassNames({ variant: "primary", size: "sm" })}
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejecting(row)}
                            disabled={actionId === row.id}
                            className={buttonClassNames({ variant: "danger", size: "sm" })}
                          >
                            Rechazar
                          </button>
                        </>
                      ) : null}
                    </div>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <AdminModal
        open={Boolean(rejecting)}
        onClose={() => {
          if (actionId) return;
          setRejecting(null);
          setRejectReason("");
        }}
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Rechazar comprobante</h2>
            <p className="mt-1 text-sm text-slate-600">
              {rejecting ? `Indica el motivo para ${rejecting.member?.full_name ?? "el socio"}.` : ""}
            </p>
          </div>
          <Input
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Ej. El monto no coincide con la transferencia"
            disabled={Boolean(actionId)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRejecting(null);
                setRejectReason("");
              }}
              disabled={Boolean(actionId)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={() => void reject()} disabled={Boolean(actionId)}>
              {actionId ? "Rechazando..." : "Rechazar"}
            </Button>
          </div>
        </div>
      </AdminModal>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}
