"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, Input } from "@/components/ui";
import {
  addMemberToGroup,
  getGroupById,
  getMembersInGroup,
  removeMemberFromGroup,
  type GroupMemberRow,
  type GroupRow,
} from "@/lib/groups";
import { listMembers } from "@/lib/supabase";

type MemberOption = {
  id: string;
  full_name: string;
  dni: string;
};

export default function AdminGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params?.id ?? "";

  const [group, setGroup] = useState<GroupRow | null>(null);
  const [membersInGroup, setMembersInGroup] = useState<GroupMemberRow[]>([]);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!groupId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const [g, inGroup, everyone] = await Promise.all([
        getGroupById(groupId),
        getMembersInGroup(groupId),
        listMembers(),
      ]);

      setGroup(g);
      setMembersInGroup(inGroup);
      setAllMembers(
        everyone.map((m) => ({
          id: m.id,
          full_name: m.full_name,
          dni: m.dni,
        }))
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cargar el grupo."
      );
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const memberIdsInGroup = useMemo(
    () => new Set(membersInGroup.map((row) => row.member.id)),
    [membersInGroup]
  );

  const addOptions = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return allMembers
      .filter((m) => !memberIdsInGroup.has(m.id))
      .filter((m) => {
        if (!q) {
          return true;
        }
        return (
          m.full_name.toLowerCase().includes(q) || m.dni.toLowerCase().includes(q)
        );
      })
      .slice(0, 80);
  }, [allMembers, memberIdsInGroup, addSearch]);

  const handleAdd = async () => {
    if (!selectedMemberId || !groupId) {
      setActionMessage("Seleccioná un socio de la lista.");
      return;
    }

    setIsAdding(true);
    try {
      await addMemberToGroup(selectedMemberId, groupId);
      setSelectedMemberId("");
      setAddSearch("");
      setActionMessage("Socio agregado al grupo.");
      await loadAll();
    } catch (error: unknown) {
      console.error(error);
      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
      if (code === "23505") {
        setActionMessage("Ese socio ya está en el grupo.");
      } else {
        setActionMessage(
          error instanceof Error ? error.message : "No se pudo agregar al socio."
        );
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!groupId) {
      return;
    }
    setRemovingKey(memberId);
    try {
      await removeMemberFromGroup(memberId, groupId);
      setActionMessage("Socio quitado del grupo.");
      await loadAll();
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudo quitar al socio."
      );
    } finally {
      setRemovingKey(null);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Cargando grupo...</p>
        </div>
      </section>
    );
  }

  if (errorMessage || !group) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-slate-700">
            {errorMessage ?? "No se encontró el grupo."}
          </p>
          <Link
            href="/admin/groups"
            className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Volver a grupos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/admin/groups"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Volver a grupos
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">
            {group.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {group.description?.trim() ? group.description : "Sin descripción"}
          </p>
        </div>
      </header>

      {actionMessage ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{actionMessage}</p>
      ) : null}

      <Card className="border border-slate-200/80 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Miembros del grupo</h2>
        <p className="mt-1 text-sm text-slate-600">
          {membersInGroup.length === 0
            ? "Todavía no hay socios asignados."
            : `${membersInGroup.length} socio(s) en este grupo.`}
        </p>

        {membersInGroup.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">DNI</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Estado</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {membersInGroup.map((row) => (
                  <tr key={row.linkId}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/members/${row.member.id}`}
                        className="font-medium text-slate-900 underline-offset-2 hover:underline"
                      >
                        {row.member.full_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.member.dni}</td>
                    <td className="px-3 py-2">
                      {row.member.status === "active" ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="warning">Pendiente</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void handleRemove(row.member.id)}
                        disabled={removingKey === row.member.id}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {removingKey === row.member.id ? "Quitando..." : "Quitar del grupo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card className="border border-slate-200/80 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Agregar miembros</h2>
        <p className="mt-1 text-sm text-slate-600">
          Buscá por nombre o DNI y elegí un socio que aún no esté en el grupo.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-1 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label htmlFor="add-member-search" className="mb-1 block text-sm font-medium text-slate-700">
              Buscar socio
            </label>
            <Input
              id="add-member-search"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="Nombre o DNI"
              className="text-sm"
            />
          </div>
          <div className="min-w-0 md:min-w-[220px]">
            <label htmlFor="add-member-select" className="mb-1 block text-sm font-medium text-slate-700">
              Socio
            </label>
            <select
              id="add-member-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">Seleccionar...</option>
              {addOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} · {m.dni}
                </option>
              ))}
            </select>
          </div>
        </div>

        {addOptions.length === 0 && allMembers.length > 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No hay más socios disponibles para agregar (o no coinciden con la búsqueda).
          </p>
        ) : null}

        <div className="mt-4">
          <Button
            type="button"
            size="md"
            onClick={() => void handleAdd()}
            disabled={isAdding || !selectedMemberId}
          >
            {isAdding ? "Agregando..." : "Agregar al grupo"}
          </Button>
        </div>
      </Card>
    </section>
  );
}
