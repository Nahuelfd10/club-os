"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminModal } from "@/components/admin/admin-modal";
import { Button, Card, Input } from "@/components/ui";
import {
  createGroup,
  deleteGroup,
  listGroupsWithMemberCount,
  type GroupWithMemberCount,
} from "@/lib/groups";

export default function AdminGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithMemberCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setErrorMessage(null);
    setActionMessage(null);
    setIsLoading(true);
    try {
      const data = await listGroupsWithMemberCount();
      setGroups(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los grupos.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setActionMessage("El nombre del grupo es obligatorio.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await createGroup({
        name,
        description: createDescription.trim() || null,
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      setActionMessage("Grupo creado correctamente.");
      await loadGroups();
      router.push(`/admin/groups/${created.id}`);
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudo crear el grupo."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (group: GroupWithMemberCount) => {
    const ok = window.confirm(
      `¿Eliminar el grupo "${group.name}"? Se quitarán todas las asignaciones de socios.`
    );
    if (!ok) {
      return;
    }

    setDeletingId(group.id);
    try {
      await deleteGroup(group.id);
      setActionMessage("Grupo eliminado.");
      await loadGroups();
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudo eliminar el grupo."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Grupos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Equipos o categorías para organizar socios.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setCreateName("");
            setCreateDescription("");
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Crear grupo
        </button>
      </header>

      <Card className="w-full border border-slate-200/80 p-6">
        {isLoading ? <p className="text-slate-600">Cargando grupos...</p> : null}

        {!isLoading && errorMessage ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}

        {!isLoading && actionMessage ? (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {actionMessage}
          </p>
        ) : null}

        {!isLoading && !errorMessage && groups.length === 0 ? (
          <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Todavía no hay grupos. Creá el primero con el botón de arriba.
          </p>
        ) : null}

        {!isLoading && !errorMessage && groups.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Descripción</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Miembros</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {groups.map((group) => (
                  <tr key={group.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-900">{group.name}</td>
                    <td className="max-w-md px-3 py-2 text-slate-700">
                      {group.description?.trim() ? group.description : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 tabular-nums">{group.memberCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/groups/${group.id}`}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          Ver detalle
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(group)}
                          disabled={deletingId === group.id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {deletingId === group.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <AdminModal open={createOpen} onClose={() => !isCreating && setCreateOpen(false)}>
        <h2 className="text-lg font-semibold text-slate-900">Nuevo grupo</h2>
        <p className="mt-1 text-sm text-slate-600">Completá el nombre y, si querés, una descripción.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="group-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre <span className="text-red-600">*</span>
            </label>
            <Input
              id="group-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ej. Sub 15"
              className="text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="group-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Descripción
            </label>
            <textarea
              id="group-desc"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              rows={3}
              placeholder="Opcional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="neutral"
            size="md"
            onClick={() => setCreateOpen(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button type="button" size="md" onClick={() => void handleCreate()} disabled={isCreating}>
            {isCreating ? "Creando..." : "Crear"}
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}
