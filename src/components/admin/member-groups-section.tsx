"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Input, Select } from "@/components/ui";
import {
  addMemberToGroup,
  getGroupsForMember,
  listAllGroupsForSelect,
  removeMemberFromGroup,
  type MemberGroupRow,
} from "@/lib/groups";
import { useClubRoutes } from "@/lib/use-club-routes";

type Props = {
  memberId: string;
};

export function MemberGroupsSection({ memberId }: Props) {
  const routes = useClubRoutes();
  const [rows, setRows] = useState<MemberGroupRow[]>([]);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  const closeAddPanel = () => {
    setAddPanelOpen(false);
    setAddSearch("");
    setSelectedGroupId("");
  };

  const openAddPanel = () => {
    setAddPanelOpen(true);
  };

  const load = useCallback(async () => {
    if (!memberId) {
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const [forMember, options] = await Promise.all([
        getGroupsForMember(memberId),
        listAllGroupsForSelect(),
      ]);
      setRows(forMember);
      setAllGroups(options);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "No se pudieron cargar los grupos."
      );
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupIds = useMemo(() => new Set(rows.map((r) => r.group.id)), [rows]);

  const groupsNotYetJoined = useMemo(
    () => allGroups.filter((g) => !groupIds.has(g.id)),
    [allGroups, groupIds]
  );

  const groupAddOptions = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return groupsNotYetJoined.filter((g) => (q ? g.name.toLowerCase().includes(q) : true));
  }, [groupsNotYetJoined, addSearch]);

  const canAddToMoreGroups = groupsNotYetJoined.length > 0;

  const handleAdd = async () => {
    if (!selectedGroupId) {
      setMessage("Seleccioná un grupo.");
      return;
    }
    setIsAdding(true);
    try {
      await addMemberToGroup(memberId, selectedGroupId);
      closeAddPanel();
      setMessage("Socio agregado al grupo.");
      await load();
    } catch (error: unknown) {
      console.error(error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "23505") {
        setMessage("Ese socio ya pertenece a ese grupo.");
      } else {
        setMessage(
          error instanceof Error ? error.message : "No se pudo agregar al grupo."
        );
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (groupId: string) => {
    setRemovingGroupId(groupId);
    try {
      await removeMemberFromGroup(memberId, groupId);
      setMessage("Socio quitado del grupo.");
      await load();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "No se pudo quitar del grupo."
      );
    } finally {
      setRemovingGroupId(null);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-950">Equipos y categorias</h2>
        <p className="text-sm text-slate-600">Cargando...</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Grupos</p>
          <h2 className="text-lg font-semibold text-slate-950">Equipos y categorias</h2>
        </div>
        {canAddToMoreGroups ? (
          <button
            type="button"
            onClick={() => (addPanelOpen ? closeAddPanel() : openAddPanel())}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            {addPanelOpen ? "Cerrar" : "Agregar a un grupo"}
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>
      ) : null}

      {addPanelOpen && canAddToMoreGroups ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-950">Elegí un grupo</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-1 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label htmlFor="member-group-search" className="mb-1 block text-xs font-medium text-slate-500">
                Buscar grupo
              </label>
              <Input
                id="member-group-search"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Nombre del grupo"
              />
            </div>
            <div className="min-w-0 md:min-w-[200px]">
              <label htmlFor="member-group-select" className="mb-1 block text-xs font-medium text-slate-500">
                Grupo
              </label>
              <Select
                id="member-group-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {groupAddOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
              {groupAddOptions.length === 0 && addSearch.trim() ? (
                <p className="mt-1 text-xs text-slate-500">No hay grupos que coincidan con la búsqueda.</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="md"
              variant="neutral"
              onClick={() => void handleAdd()}
              disabled={isAdding || !selectedGroupId}
            >
              {isAdding ? "Agregando..." : "Agregar al grupo"}
            </Button>
            <Button type="button" size="md" variant="neutral" onClick={closeAddPanel} disabled={isAdding}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">Este socio no está en ningún grupo todavía.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.linkId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <Link
                  href={routes.adminPath(`groups/${row.group.id}`)}
                  className="font-semibold text-slate-950 underline-offset-2 hover:underline"
                >
                  {row.group.name}
                </Link>
                {row.group.description?.trim() ? (
                  <p className="text-xs text-slate-600">{row.group.description}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void handleRemove(row.group.id)}
                disabled={removingGroupId === row.group.id}
              >
                {removingGroupId === row.group.id ? "Quitando..." : "Quitar"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!canAddToMoreGroups ? (
        <p className="mt-4 text-sm text-slate-600">
          {allGroups.length === 0
            ? "No hay grupos creados en el club."
            : "Este socio ya pertenece a todos los grupos disponibles."}
        </p>
      ) : null}
    </section>
  );
}
