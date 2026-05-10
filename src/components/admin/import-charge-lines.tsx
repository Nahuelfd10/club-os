"use client";

import { useId, useRef, useState } from "react";
import { FileSpreadsheet, Trash2 } from "lucide-react";

import { AdminModal } from "@/components/admin/admin-modal";
import { Alert, Button } from "@/components/ui";
import { addChargeLine, registerChargePayment } from "@/lib/charges";
import { DEFAULT_PAYMENT_METHOD } from "@/config/payment-method";
import { formatMoney } from "@/lib/formatters";
import { listMembers } from "@/lib/supabase";

/**
 * Importador de líneas desde planillas xlsx.
 *
 * Flujo:
 *   1. Admin abre el modal y elige el archivo.
 *   2. Parseamos client-side con SheetJS (Cantidad / Jugador / Talle / Pago / Debe).
 *   3. Mostramos preview editable: el admin puede borrar filas dudosas antes de
 *      confirmar. Las líneas creadas SIEMPRE quedan como "externas"
 *      (member_id=null) — no inferimos socios. El admin reasigna después
 *      desde el detalle del cargo.
 *   4. Al confirmar, recorremos las líneas y por cada una:
 *      - addChargeLine(...) → id
 *      - si Pago > 0 → registerChargePayment(id, ...)
 */

type ParsedRow = {
  rowIndex: number;
  source: "left" | "right";
  cantidad: number;
  jugador: string;
  talle: string | null;
  pago: number;
  debe: number;
  /** total = pago + debe */
  total: number;
  matchedMemberId: string | null;
  /** Warning para mostrar en preview (ej. "total ≠ esperado"). */
  warning?: string;
};

type ImportChargeLinesProps = {
  chargeId: string;
  /** Notifica al padre cuando terminó (con o sin errores) para que recargue. */
  onImported: () => void | Promise<void>;
};

type MemberOption = { id: string; full_name: string; dni: string; status: "pending" | "active" };

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/\$|\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

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

/**
 * Detecta una "subtabla" dentro de la matriz: dado un offset de columna
 * (0 para la primera mitad, 6 para la segunda), busca header "Cantidad/Jugador..."
 * y devuelve las filas no-vacías con sus 5 campos.
 */
function extractSubtable(
  matrix: unknown[][],
  colOffset: number,
  source: "left" | "right",
  members: MemberOption[]
): ParsedRow[] {
  const out: ParsedRow[] = [];
  // Buscamos el header para saber a partir de qué fila arrancan los datos.
  let dataStart = -1;
  for (let i = 0; i < matrix.length; i++) {
    const headerCantidad = asString(matrix[i][colOffset]);
    const headerJugador = asString(matrix[i][colOffset + 1]);
    if (
      headerCantidad?.toLowerCase().includes("cantidad") &&
      headerJugador?.toLowerCase().includes("jugador")
    ) {
      dataStart = i + 1;
    }
  }
  if (dataStart === -1) return out;

  for (let i = dataStart; i < matrix.length; i++) {
    const cantidadRaw = matrix[i][colOffset];
    const jugadorRaw = matrix[i][colOffset + 1];
    const jugador = asString(jugadorRaw);
    if (!jugador) continue;
    // Si en la fila hay otra vez header (subtabla repetida), ignoramos esta fila
    // y dejamos que la otra invocación de extractSubtable la capture.
    if (asString(jugadorRaw)?.toLowerCase() === "jugador") continue;
    const cantidad = parseNumber(cantidadRaw);
    if (cantidad <= 0) continue;
    const talle = asString(matrix[i][colOffset + 2]);
    const pago = parseNumber(matrix[i][colOffset + 3]);
    const debe = parseNumber(matrix[i][colOffset + 4]);
    const total = pago + debe;
    if (total <= 0) continue;
    out.push({
      rowIndex: i,
      source,
      cantidad: Math.max(1, Math.floor(cantidad)),
      jugador,
      talle,
      pago,
      debe,
      total,
      matchedMemberId: guessMemberId(jugador, members),
    });
  }
  return out;
}

export function ImportChargeLines({ chargeId, onImported }: ImportChargeLinesProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const totalUnits = previewRows.reduce((sum, r) => sum + r.cantidad, 0);
  const totalAmount = previewRows.reduce((sum, r) => sum + r.total, 0);
  const totalPaid = previewRows.reduce((sum, r) => sum + r.pago, 0);

  const reset = () => {
    setFileName(null);
    setPreviewRows([]);
    setParseError(null);
    setImportLog([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeModal = () => {
    if (!isImporting) {
      setIsOpen(false);
      reset();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParseError(null);
    setPreviewRows([]);
    setFileName(file.name);

    try {
      // Cargar SheetJS dinámicamente sólo cuando el admin sube el archivo.
      const XLSX = await import("xlsx");
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
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        throw new Error("La planilla no tiene hojas.");
      }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        raw: true,
      });

      const left = extractSubtable(matrix, 0, "left", activeMembers);
      const right = extractSubtable(matrix, 6, "right", activeMembers);
      const merged = [...left, ...right];

      if (merged.length === 0) {
        setParseError(
          "No detecté líneas válidas. Verificá que las columnas sean Cantidad, Jugador, Talle, Pago, Debe."
        );
        return;
      }

      setPreviewRows(merged);
    } catch (err) {
      console.error("import xlsx failed", err);
      setParseError(
        err instanceof Error ? err.message : "No se pudo leer el archivo. Confirmá que sea .xlsx."
      );
    }
  };

  const removePreviewRow = (index: number) => {
    setPreviewRows((rows) => rows.filter((_, i) => i !== index));
  };

  const updatePreviewMatch = (index: number, memberId: string) => {
    setPreviewRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, matchedMemberId: memberId || null } : row))
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
    const nowIso = new Date().toISOString();

    for (const row of previewRows) {
      try {
        const lineId = await addChargeLine(chargeId, {
          member_id: row.matchedMemberId,
          external_name: row.matchedMemberId ? null : row.jugador,
          description: row.talle ?? null,
          quantity: row.cantidad,
          amount: row.total,
        });
        okCount += 1;

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
            log.push(`✗ Pago de "${row.jugador}" (${formatMoney(row.pago)}) no se registró: ${msg}`);
          }
        }
      } catch (err) {
        errorCount += 1;
        const msg = err instanceof Error ? err.message : "error desconocido";
        log.push(`✗ "${row.jugador}" no se pudo crear: ${msg}`);
      }
    }

    log.unshift(
      `✓ ${okCount} línea(s) creada(s), ${paymentCount} pago(s) registrado(s), ${errorCount} con error.`
    );
    setImportLog(log);
    setIsImporting(false);
    await onImported();

    if (errorCount === 0) {
      // Cerrar automáticamente si todo salió OK.
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
        Importar planilla
      </Button>

      <AdminModal open={isOpen} onClose={closeModal} width="2xl">
        <h2 className="text-lg font-semibold text-white">Importar líneas desde planilla</h2>
        <p className="mt-1 text-sm text-slate-300">
          Las líneas se cargan como <strong>compradores externos</strong>. Después, en el detalle
          del cargo, reasignás fila por fila al socio correspondiente.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor={fileInputId} className="mb-1 block text-sm font-medium text-slate-300">
              Archivo .xlsx
            </label>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => void handleFileChange(e)}
              disabled={isImporting}
              className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-white/20"
            />
            {fileName ? (
              <p className="mt-1 text-xs text-slate-400">Archivo: {fileName}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Columnas esperadas: <strong className="text-slate-200">Cantidad</strong>,{" "}
                <strong className="text-slate-200">Jugador</strong>,{" "}
                <strong className="text-slate-200">Talle</strong>,{" "}
                <strong className="text-slate-200">Pago</strong>,{" "}
                <strong className="text-slate-200">Debe</strong>.
              </p>
            )}
          </div>

          {parseError ? <Alert variant="danger">{parseError}</Alert> : null}

          {previewRows.length > 0 ? (
            <>
              <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-300 sm:grid-cols-3">
                <div>
                  <span className="text-white/45">Líneas</span>
                  <p className="mt-0.5 text-base font-bold text-white">
                    {previewRows.length}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      ({totalUnits} unidad{totalUnits === 1 ? "" : "es"})
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-white/45">Total</span>
                  <p className="mt-0.5 text-base font-bold text-white">{formatMoney(totalAmount)}</p>
                </div>
                <div>
                  <span className="text-white/45">Ya pagado</span>
                  <p className="mt-0.5 text-base font-bold text-success">
                    {formatMoney(totalPaid)}
                  </p>
                </div>
              </div>

              <div className="max-h-96 overflow-auto rounded-lg border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-left text-xs">
                  <thead className="sticky top-0 bg-slate-950/95 text-white/55 backdrop-blur-sm">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Cant.</th>
                      <th className="px-2 py-2 font-semibold">Jugador (planilla)</th>
                      <th className="px-2 py-2 font-semibold">Socio / externo</th>
                      <th className="px-2 py-2 font-semibold">Talle</th>
                      <th className="px-2 py-2 text-right font-semibold">Pago</th>
                      <th className="px-2 py-2 text-right font-semibold">Debe</th>
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                      <th className="px-2 py-2" aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {previewRows.map((row, i) => (
                      <tr
                        key={`${row.source}-${row.rowIndex}-${i}`}
                        className="hover:bg-white/[0.04]"
                      >
                        <td className="px-2 py-1.5 tabular-nums">{row.cantidad}</td>
                        <td className="px-2 py-1.5 font-medium text-white">{row.jugador}</td>
                        <td className="px-2 py-1.5">
                          <select
                            value={row.matchedMemberId ?? ""}
                            onChange={(event) => updatePreviewMatch(i, event.target.value)}
                            className="min-w-44 rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-white/25"
                          >
                            <option value="">Externo</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.full_name} - {member.dni}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-slate-400">{row.talle ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-success">
                          {row.pago > 0 ? formatMoney(row.pago) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-warning">
                          {row.debe > 0 ? formatMoney(row.debe) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-white">
                          {formatMoney(row.total)}
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removePreviewRow(i)}
                            className="rounded-md border border-white/10 bg-white/[0.04] p-1 text-slate-400 transition-colors hover:bg-danger/15 hover:text-danger"
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
              <p className="text-xs text-slate-400">
                Si ves alguna fila dudosa, quitala con el ícono ✕. Si querés ajustar montos,
                conviene importar y editar después desde el detalle del cargo.
              </p>
            </>
          ) : null}

          {importLog.length > 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200">
              {importLog.map((line, i) => (
                <p key={i} className={line.startsWith("✗") ? "text-danger" : ""}>
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
            <Button
              type="button"
              size="md"
              onClick={() => void handleImport()}
              disabled={isImporting}
            >
              {isImporting ? "Importando..." : `Importar ${previewRows.length} línea(s)`}
            </Button>
          ) : null}
        </div>
      </AdminModal>
    </>
  );
}
