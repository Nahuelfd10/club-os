"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { Download, FileSpreadsheet, MessageSquareText, Trash2 } from "lucide-react";

import { AdminModal } from "@/components/admin/admin-modal";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import { createChargeExtraContribution } from "@/lib/charge-contributions";
import { addChargeLine, registerChargePayment } from "@/lib/charges";
import type { ChargeListKind } from "@/lib/charges";
import { DEFAULT_PAYMENT_METHOD } from "@/config/payment-method";
import { formatMoney } from "@/lib/formatters";
import { listMembers } from "@/lib/supabase";
import type { MemberStatus } from "@/types";

type ParsedRow = {
  rowIndex: number;
  source: "excel" | "whatsapp";
  cantidad: number;
  jugador: string;
  detalle: string | null;
  reportedPago: number;
  pago: number;
  overpaidAmount: number;
  debe: number;
  total: number;
  matchedMemberId: string | null;
};

type ImportChargeLinesProps = {
  chargeId: string;
  expectedAmount?: number;
  listKind?: ChargeListKind;
  onImported: () => void | Promise<void>;
};

type MemberOption = { id: string; full_name: string; dni: string; status: MemberStatus };

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value).replace(/\$|\s/g, "");
  const cleaned = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const whatsAppAmountPattern = /\$?\s*([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]+)(?:,[0-9]{1,2})?/;

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

function normalizeLookup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findColumn(headers: unknown[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeLookup);
  return headers.findIndex((header) => {
    const normalized = normalizeLookup(asString(header) ?? "");
    return normalizedAliases.some((alias) => normalized === alias || normalized.includes(alias));
  });
}

function guessMemberId(name: string, members: MemberOption[]): string | null {
  const normalized = normalizeLookup(name);
  if (!normalized) return null;

  const exact = members.find((member) => normalizeLookup(member.full_name) === normalized);
  if (exact) return exact.id;

  const byDni = members.find((member) => member.dni && normalized.includes(member.dni));
  if (byDni) return byDni.id;

  const tokens = normalized.split(" ").filter((token) => token.length >= 3);
  const scored = members
    .map((member) => {
      const memberText = normalizeLookup(`${member.full_name} ${member.dni}`);
      return { member, score: tokens.filter((token) => memberText.includes(token)).length };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return (scored[0]?.score ?? 0) >= Math.min(2, tokens.length) ? scored[0].member.id : null;
}

function normalizePreviewMoney(totalInput: number, reportedPaidInput: number) {
  const total = Math.max(0, Number(totalInput) || 0);
  const reportedPago = Math.max(0, Number(reportedPaidInput) || 0);
  const pago = Math.min(reportedPago, total);
  return {
    total,
    reportedPago,
    pago,
    overpaidAmount: Math.max(0, reportedPago - total),
    debe: Math.max(0, total - pago),
  };
}

function extractRowsFromMatrix(matrix: unknown[][], members: MemberOption[], expectedAmount: number): ParsedRow[] {
  let headerRow = -1;
  let columns:
    | {
        name: number;
        quantity: number;
        size: number;
        detail: number;
        paid: number;
        debt: number;
        total: number;
        note: number;
      }
    | null = null;

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    const name = findColumn(row, ["nombre", "jugador", "persona", "comprador"]);
    if (name === -1) continue;
    columns = {
      name,
      quantity: findColumn(row, ["cantidad", "cant"]),
      size: findColumn(row, ["talle"]),
      detail: findColumn(row, ["detalle", "concepto", "producto"]),
      paid: findColumn(row, ["pagado", "pago", "monto pagado", "senia", "sena", "seña"]),
      debt: findColumn(row, ["debe", "restante", "saldo"]),
      total: findColumn(row, ["total", "importe", "monto", "total a pagar"]),
      note: findColumn(row, ["nota", "observacion"]),
    };
    headerRow = i;
    break;
  }

  if (!columns) return [];

  const out: ParsedRow[] = [];
  for (let i = headerRow + 1; i < matrix.length; i++) {
    const row = matrix[i];
    const jugador = asString(row[columns.name]);
    if (!jugador) continue;
    const normalizedName = normalizeLookup(jugador);
    if (normalizedName === "jugador" || normalizedName === "nombre") continue;

    const cantidad = columns.quantity >= 0 ? parseNumber(row[columns.quantity]) : 1;
    if (cantidad <= 0) continue;

    const detalle = [
      columns.size >= 0 ? asString(row[columns.size]) : null,
      columns.detail >= 0 ? asString(row[columns.detail]) : null,
      columns.note >= 0 ? asString(row[columns.note]) : null,
    ]
      .filter(Boolean)
      .join(" - ") || null;
    const reportedPago = columns.paid >= 0 ? parseNumber(row[columns.paid]) : 0;
    const debe = columns.debt >= 0 ? parseNumber(row[columns.debt]) : 0;
    const explicitTotal = columns.total >= 0 ? parseNumber(row[columns.total]) : 0;
    const total = explicitTotal > 0 ? explicitTotal : reportedPago + debe || expectedAmount || reportedPago;
    if (total <= 0) continue;
    const money = normalizePreviewMoney(total, reportedPago);

    out.push({
      rowIndex: i,
      source: "excel",
      cantidad: Math.max(1, Math.floor(cantidad)),
      jugador,
      detalle,
      ...money,
      matchedMemberId: guessMemberId(jugador, members),
    });
  }

  return out;
}

function parseWhatsAppRows(text: string, members: MemberOption[], expectedAmount: number): ParsedRow[] {
  const candidates = text
    .split(/\r?\n/)
    .map((line, index) => {
      const clean = line.replace(/^[*\-\u2022\s]+/, "").trim();
      if (!clean || normalizeLookup(clean).startsWith("alias")) return null;
      const amountMatch = clean.match(whatsAppAmountPattern);
      if (!amountMatch) return null;

      const name = clean.slice(0, amountMatch.index).trim().replace(/[.:>-]+$/g, "").trim();
      if (!name) return null;

      return {
        index,
        name,
        pago: parseNumber(amountMatch[0]),
      };
    })
    .filter((row): row is { index: number; name: string; pago: number } => Boolean(row));

  return candidates.map((row) => {
    const total = expectedAmount > 0 ? expectedAmount : row.pago;
    const money = normalizePreviewMoney(total, row.pago);
    return {
      rowIndex: row.index,
      source: "whatsapp",
      cantidad: 1,
      jugador: row.name,
      detalle: null,
      ...money,
      matchedMemberId: guessMemberId(row.name, members),
    };
  });
}

function detectWhatsAppCompleteAmount(text: string): number {
  const completeAmounts = text
    .split(/\r?\n/)
    .map((line) => {
      const clean = line.trim();
      if (!normalizeLookup(clean).includes("completo")) return 0;
      const amountMatch = clean.match(whatsAppAmountPattern);
      return amountMatch ? parseNumber(amountMatch[0]) : 0;
    })
    .filter((amount) => amount > 0);

  if (completeAmounts.length === 0) return 0;
  return [...completeAmounts].sort((a, b) => {
    const freqA = completeAmounts.filter((amount) => amount === a).length;
    const freqB = completeAmounts.filter((amount) => amount === b).length;
    return freqB - freqA || a - b;
  })[0];
}

export function ImportChargeLines({ chargeId, expectedAmount = 0, listKind = "general", onImported }: ImportChargeLinesProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [importMode, setImportMode] = useState<"whatsapp" | "excel">("whatsapp");
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [whatsAppText, setWhatsAppText] = useState("");
  const [whatsAppExpectedAmount, setWhatsAppExpectedAmount] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const totalUnits = previewRows.reduce((sum, r) => sum + r.cantidad, 0);
  const totalAmount = previewRows.reduce((sum, r) => sum + r.total, 0);
  const totalPaid = previewRows.reduce((sum, r) => sum + r.pago, 0);
  const totalOverpaid = previewRows.reduce((sum, r) => sum + r.overpaidAmount, 0);
  const isOrderList = listKind === "order";
  const manualWhatsAppExpectedAmount = parseNumber(whatsAppExpectedAmount);
  const effectiveWhatsAppExpectedAmount =
    expectedAmount > 0 ? expectedAmount : manualWhatsAppExpectedAmount;
  const suggestedWhatsAppExpectedAmount =
    expectedAmount <= 0 && whatsAppText.trim() ? detectWhatsAppCompleteAmount(whatsAppText) : 0;

  const reset = () => {
    setFileName(null);
    setImportMode("whatsapp");
    setPreviewRows([]);
    setWhatsAppText("");
    setWhatsAppExpectedAmount("");
    setParseError(null);
    setImportLog([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchMode = (mode: "whatsapp" | "excel") => {
    setImportMode(mode);
    setPreviewRows([]);
    setParseError(null);
    setImportLog([]);
  };

  const closeModal = () => {
    if (!isImporting) {
      setIsOpen(false);
      reset();
    }
  };

  const loadActiveMembers = async () => {
    if (members.length > 0) return members;
    const memberRows = await listMembers();
    const activeMembers = (memberRows ?? [])
      .filter((member) => member.status === "active")
      .map((member) => ({
        id: member.id,
        full_name: member.full_name,
        dni: member.dni,
        status: member.status,
      }));
    setMembers(activeMembers);
    return activeMembers;
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = ["Nombre", "Talle", "Detalle", "Cantidad", "Total", "Pagado", "Debe", "Telefono", "Nota"];
    const example = [
      "Ej. Juan Perez",
      isOrderList ? "XL" : "",
      isOrderList ? "Campera" : "Inscripcion / seguro",
      1,
      expectedAmount || 15000,
      0,
      expectedAmount || 15000,
      "",
      "",
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla-lista-recaudacion.xlsx");
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParseError(null);
    setPreviewRows([]);
    setImportLog([]);
    setFileName(file.name);

    try {
      const XLSX = await import("xlsx");
      const activeMembers = await loadActiveMembers();
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const allRows = wb.SheetNames.flatMap((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) return [];
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: null,
          raw: true,
        });
        return extractRowsFromMatrix(matrix, activeMembers, expectedAmount);
      });

      if (allRows.length === 0) {
        setParseError(
          "No detecte lineas validas. Usa columnas Nombre, Talle/Detalle, Cantidad, Total, Pagado/Sena y Debe."
        );
        return;
      }

      setPreviewRows(allRows);
    } catch (err) {
      console.error("import xlsx failed", err);
      setParseError(err instanceof Error ? err.message : "No se pudo leer el archivo. Confirma que sea .xlsx.");
    }
  };

  const handleParseWhatsApp = async () => {
    setParseError(null);
    setPreviewRows([]);
    setImportLog([]);
    try {
      const activeMembers = await loadActiveMembers();
      const rows = parseWhatsAppRows(whatsAppText, activeMembers, effectiveWhatsAppExpectedAmount);
      if (rows.length === 0) {
        setParseError("No detecte nombres con montos. Ejemplo: Juan $117.000 completo.");
        return;
      }
      setFileName("Texto de WhatsApp");
      setPreviewRows(rows);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "No se pudo procesar el texto.");
    }
  };

  const removePreviewRow = (index: number) => {
    setPreviewRows((rows) => rows.filter((_, i) => i !== index));
  };

  const updatePreviewRow = (index: number, patch: Partial<ParsedRow>) => {
    setPreviewRows((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        return {
          ...next,
          ...normalizePreviewMoney(next.total, next.reportedPago),
        };
      })
    );
  };

  const handleImport = async () => {
    if (previewRows.length === 0) return;
    setIsImporting(true);
    setImportLog([]);
    const log: string[] = [];

    let okCount = 0;
    let errorCount = 0;
    let paymentCount = 0;
    let contributionCount = 0;
    let overpaidTotal = 0;
    const nowIso = new Date().toISOString();

    for (const row of previewRows) {
      try {
        const lineId = await addChargeLine(chargeId, {
          member_id: row.matchedMemberId,
          external_name: row.matchedMemberId ? null : row.jugador,
          description: row.detalle,
          quantity: row.cantidad,
          amount: row.total,
        });
        okCount += 1;
        overpaidTotal += row.overpaidAmount;

        if (row.pago > 0) {
          try {
            await registerChargePayment({
              member_charge_id: lineId,
              amount: row.pago,
              paid_at: nowIso,
              payment_method: DEFAULT_PAYMENT_METHOD,
            });
            paymentCount += 1;
          } catch (payErr) {
            const msg = payErr instanceof Error ? payErr.message : "error desconocido";
            log.push(`Pago de "${row.jugador}" (${formatMoney(row.pago)}) no se registro: ${msg}`);
          }
        }

        if (row.overpaidAmount > 0) {
          try {
            await createChargeExtraContribution({
              charge_id: chargeId,
              member_charge_id: lineId,
              member_id: row.matchedMemberId,
              contributor_name: row.matchedMemberId ? null : row.jugador,
              amount: row.overpaidAmount,
              contributed_at: nowIso,
              payment_method: DEFAULT_PAYMENT_METHOD,
              note: `Sobrante importado. Monto informado: ${formatMoney(row.reportedPago)}.`,
            });
            contributionCount += 1;
          } catch (contributionErr) {
            const msg = contributionErr instanceof Error ? contributionErr.message : "error desconocido";
            log.push(`Sobrante de "${row.jugador}" (${formatMoney(row.overpaidAmount)}) no se registro: ${msg}`);
          }
        }
      } catch (err) {
        errorCount += 1;
        const msg = err instanceof Error ? err.message : "error desconocido";
        log.push(`"${row.jugador}" no se pudo crear: ${msg}`);
      }
    }

    log.unshift(`${okCount} linea(s) creada(s), ${paymentCount} pago(s) registrado(s), ${contributionCount} aporte(s) extra, ${errorCount} con error.`);
    if (overpaidTotal > 0) {
      log.push(`Sobrante detectado: ${formatMoney(overpaidTotal)} registrado como aporte extra de la lista.`);
    }
    setImportLog(log);
    setIsImporting(false);
    await onImported();

    if (errorCount === 0) {
      window.setTimeout(() => {
        setIsOpen(false);
        reset();
      }, 1500);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="neutral" onClick={() => setIsOpen(true)}>
        <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        Cargar lista
      </Button>

      <AdminModal open={isOpen} onClose={closeModal} width="2xl">
        <h2 className="text-lg font-semibold text-slate-900">Cargar personas en la lista</h2>
        <p className="mt-1 text-sm text-slate-600">
          Importa una planilla base o pega una lista de WhatsApp. Antes de guardar vas a revisar cada linea.
        </p>

        <div className="mt-4 space-y-4">
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => switchMode("whatsapp")}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                importMode === "whatsapp"
                  ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              <MessageSquareText className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              Texto de WhatsApp
            </button>
            <button
              type="button"
              onClick={() => switchMode("excel")}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                importMode === "excel"
                  ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              Archivo Excel
            </button>
          </div>

          {importMode === "excel" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Archivo .xlsx</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Usa una planilla simple con una persona o pedido por fila.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownloadTemplate()}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Plantilla
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => void handleFileChange(e)}
                  disabled={isImporting}
                  className="sr-only"
                />
                <label
                  htmlFor={fileInputId}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <FileSpreadsheet className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                  Seleccionar archivo
                </label>
                <span className="min-w-0 text-sm text-slate-600">
                  {fileName && fileName !== "Texto de WhatsApp" ? fileName : "Todavia no seleccionaste archivo."}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Columnas recomendadas: Nombre, Talle, Detalle, Cantidad, Total, Pagado/Sena, Debe, Telefono, Nota.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label htmlFor="whatsapp-lines" className="block text-sm font-semibold text-slate-600">
                Texto de WhatsApp
              </label>
              <Textarea
                id="whatsapp-lines"
                value={whatsAppText}
                onChange={(event) => {
                  setWhatsAppText(event.target.value);
                  setPreviewRows([]);
                  setParseError(null);
                }}
                rows={5}
                placeholder={"Cabe $117.000 completo\nTolo Jose $55.000\nRodri $15.000"}
                className="mt-2 rounded-lg border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus:border-primary/45 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--club-primary)_12%,transparent)]"
              />
              {expectedAmount <= 0 ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label htmlFor="whatsapp-expected-amount" className="block text-xs font-semibold text-slate-700">
                    Monto esperado por persona para esta carga
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      id="whatsapp-expected-amount"
                      value={whatsAppExpectedAmount}
                      onChange={(event) => {
                        setWhatsAppExpectedAmount(event.target.value);
                        setPreviewRows([]);
                        setParseError(null);
                      }}
                      inputMode="decimal"
                      placeholder="Ej. 117000"
                      className="h-9 max-w-40 rounded-lg border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    {suggestedWhatsAppExpectedAmount > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setWhatsAppExpectedAmount(String(suggestedWhatsAppExpectedAmount));
                          setPreviewRows([]);
                          setParseError(null);
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        Usar {formatMoney(suggestedWhatsAppExpectedAmount)}
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Se usa para calcular parciales y pendientes. Si todos tienen montos distintos, podes corregir los
                    totales en la preview.
                  </p>
                </div>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="neutral"
                className="mt-2"
                onClick={() => void handleParseWhatsApp()}
                disabled={
                  isImporting ||
                  whatsAppText.trim().length === 0 ||
                  (expectedAmount <= 0 && manualWhatsAppExpectedAmount <= 0)
                }
              >
                <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                Previsualizar texto
              </Button>
            </div>
          )}

          {expectedAmount > 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Monto esperado por persona: <strong className="text-slate-900">{formatMoney(expectedAmount)}</strong>.
              En WhatsApp, los pagos parciales se comparan contra ese monto.
            </p>
          ) : null}

          {expectedAmount <= 0 && previewRows.some((row) => row.source === "whatsapp") ? (
            <p className="rounded-lg border border-info/20 bg-info/5 px-3 py-2 text-xs text-slate-700">
              Esta preview usa <strong>{formatMoney(effectiveWhatsAppExpectedAmount)}</strong> como total esperado por
              persona. Podes corregir cada total antes de importar.
            </p>
          ) : null}

          {totalOverpaid > 0 ? (
            <p className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
              Hay <strong>{formatMoney(totalOverpaid)}</strong> de sobrante. Se aplica como pagado hasta cubrir cada
              total y el excedente queda indicado en la preview.
            </p>
          ) : null}

          {parseError ? <Alert variant="danger">{parseError}</Alert> : null}

          {previewRows.length > 0 ? (
            <>
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 sm:grid-cols-3">
                <div>
                  <span className="text-slate-500">Lineas</span>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {previewRows.length}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      ({totalUnits} unidad{totalUnits === 1 ? "" : "es"})
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Total</span>
                  <p className="mt-0.5 text-base font-bold text-slate-900">{formatMoney(totalAmount)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Ya pagado</span>
                  <p className="mt-0.5 text-base font-bold text-success">{formatMoney(totalPaid)}</p>
                </div>
              </div>

              <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-[920px] divide-y divide-slate-200 text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600 backdrop-blur-sm">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Cant.</th>
                      <th className="px-2 py-2 font-semibold">Nombre</th>
                      <th className="px-2 py-2 font-semibold">Socio / externo</th>
                      <th className="px-2 py-2 font-semibold">{isOrderList ? "Talle / detalle" : "Detalle"}</th>
                      <th className="px-2 py-2 text-right font-semibold">{isOrderList ? "Sena / pagado" : "Pagado"}</th>
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                      <th className="px-2 py-2 text-right font-semibold">Debe</th>
                      <th className="px-2 py-2" aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {previewRows.map((row, i) => (
                      <tr key={`${row.source}-${row.rowIndex}-${i}`} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="1"
                            value={row.cantidad}
                            onChange={(event) => updatePreviewRow(i, { cantidad: Number(event.target.value) || 1 })}
                            className="h-8 w-16 rounded-lg border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={row.jugador}
                            onChange={(event) => updatePreviewRow(i, { jugador: event.target.value })}
                            className="h-8 min-w-36 rounded-lg border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={row.matchedMemberId ?? ""}
                            onChange={(event) => updatePreviewRow(i, { matchedMemberId: event.target.value || null })}
                            className="min-w-44 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-primary/45"
                          >
                            <option value="">Externo</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.full_name} - {member.dni}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={row.detalle ?? ""}
                            onChange={(event) => updatePreviewRow(i, { detalle: event.target.value || null })}
                            className="h-8 min-w-28 rounded-lg border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={row.reportedPago}
                            inputMode="decimal"
                            onChange={(event) => updatePreviewRow(i, { reportedPago: parseNumber(event.target.value) })}
                            className="h-8 w-24 rounded-lg border-slate-200 bg-white px-2 py-1 text-right text-xs text-success"
                          />
                          {row.overpaidAmount > 0 ? (
                            <p className="mt-1 w-24 text-right text-[10px] font-semibold leading-tight text-warning">
                              Aplica {formatMoney(row.pago)}
                              <br />
                              Sobra {formatMoney(row.overpaidAmount)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={row.total}
                            inputMode="decimal"
                            onChange={(event) => updatePreviewRow(i, { total: parseNumber(event.target.value) })}
                            className="h-8 w-24 rounded-lg border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-900"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-warning">
                          {row.debe > 0 ? formatMoney(row.debe) : "-"}
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removePreviewRow(i)}
                            className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
                            title="Quitar del import"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {importLog.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {importLog.map((line, i) => (
                <p key={i} className={line.includes("no se") ? "text-danger" : ""}>
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="neutral" size="md" onClick={closeModal} disabled={isImporting}>
            Cerrar
          </Button>
          {previewRows.length > 0 ? (
            <Button type="button" size="md" onClick={() => void handleImport()} disabled={isImporting}>
              {isImporting ? "Importando..." : `Importar ${previewRows.length} linea(s)`}
            </Button>
          ) : null}
        </div>
      </AdminModal>
    </>
  );
}
