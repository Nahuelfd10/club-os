"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getChargesForMember, type ChargeWithGroup } from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";

function formatDueDate(iso: string | null): string {
  if (!iso) {
    return "Sin vencimiento";
  }
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR");
  } catch {
    return iso;
  }
}

type Props = {
  memberId: string;
};

export function MemberChargesSection({ memberId }: Props) {
  const [charges, setCharges] = useState<ChargeWithGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!memberId) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getChargesForMember(memberId);
      setCharges(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron cargar los cargos."
      );
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Cargos</h2>
        <p className="text-sm text-slate-600">Cargando...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Cargos</h2>
        <p className="text-sm text-red-700">{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Cargos</h2>
      <p className="mb-4 text-sm text-slate-600">
        Cargos de los grupos a los que pertenece este socio (solo consulta).
      </p>

      {charges.length === 0 ? (
        <p className="text-sm text-slate-600">No hay cargos en sus grupos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Grupo</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Monto</th>
                <th className="px-3 py-2 font-semibold text-slate-700">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {charges.map((charge) => (
                <tr key={charge.id}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-slate-900">{charge.name}</span>
                    {charge.description?.trim() ? (
                      <p className="mt-0.5 text-xs text-slate-600">{charge.description}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <Link
                      href={`/admin/groups/${charge.group.id}`}
                      className="underline-offset-2 hover:text-slate-900 hover:underline"
                    >
                      {charge.group.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-900">
                    {formatMoney(charge.amount)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatDueDate(charge.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
