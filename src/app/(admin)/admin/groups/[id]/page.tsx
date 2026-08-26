"use client";

import { ChevronLeft, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/admin-modal";
import {
  Alert,
  Badge,
  Button,
  Input,
  PageHeader,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Td,
  Th,
  buttonClassNames,
} from "@/components/ui";
import { getChargesByGroupId, type ChargeWithGroup } from "@/lib/charges";
import { formatMoney } from "@/lib/formatters";
import {
  addMemberToGroup,
  getGroupById,
  getMembersInGroup,
  removeMemberFromGroup,
  updateGroup,
  type GroupMemberRow,
  type GroupRow,
} from "@/lib/groups";
import { listMembers } from "@/lib/supabase";
import { useClubRoutes } from "@/lib/use-club-routes";

type MemberOption = {
  id: string;
  full_name: string;
  dni: string;
  status: string;
};

function formatChargeDueDate(iso: string | null): string {
  if (!iso) {
    return "-";
  }

  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR");
  } catch {
    return iso;
  }
}

export default function AdminGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const routes = useClubRoutes();
  const groupId = params?.id ?? "";

  const [group, setGroup] = useState<GroupRow | null>(null);
  const [membersInGroup, setMembersInGroup] = useState<GroupMemberRow[]>([]);
  const [groupCharges, setGroupCharges] = useState<ChargeWithGroup[]>([]);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!groupId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const [g, inGroup, charges, everyone] = await Promise.all([
        getGroupById(groupId),
        getMembersInGroup(groupId),
        getChargesByGroupId(groupId),
        listMembers(),
      ]);

      setGroup(g);
      setMembersInGroup(inGroup);
      setGroupCharges(charges);
      setAllMembers(
        everyone.map((member) => ({
          id: member.id,
          full_name: member.full_name,
          dni: member.dni,
          status: member.status,
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
    const query = addSearch.trim().toLowerCase();

    return allMembers
      .filter((member) => member.status === "active")
      .filter((member) => !memberIdsInGroup.has(member.id))
      .filter((member) => {
        if (!query) {
          return true;
        }

        return (
          member.full_name.toLowerCase().includes(query) ||
          member.dni.toLowerCase().includes(query)
        );
      })
      .slice(0, 80);
  }, [allMembers, memberIdsInGroup, addSearch]);

  const handleAdd = async (memberId: string) => {
    if (!memberId || !groupId) {
      return;
    }

    setAddingMemberId(memberId);
    try {
      await addMemberToGroup(memberId, groupId);
      setAddSearch("");
      setActionMessage("Socio agregado al grupo.");
      await loadAll();
    } catch (error: unknown) {
      console.error(error);
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";

      if (code === "23505") {
        setActionMessage("Ese socio ya esta en el grupo.");
      } else {
        setActionMessage(
          error instanceof Error ? error.message : "No se pudo agregar al socio."
        );
      }
    } finally {
      setAddingMemberId(null);
    }
  };

  const openEditModal = () => {
    if (!group) {
      return;
    }

    setEditName(group.name);
    setEditDescription(group.description ?? "");
    setEditModalOpen(true);
  };

  const handleUpdateGroup = async () => {
    if (!groupId) {
      return;
    }

    const name = editName.trim();
    if (!name) {
      setActionMessage("El nombre del grupo es obligatorio.");
      return;
    }

    setIsSavingGroup(true);
    try {
      const updated = await updateGroup(groupId, {
        name,
        description: editDescription,
      });
      setGroup(updated);
      setEditModalOpen(false);
      setActionMessage("Grupo actualizado.");
    } catch (error) {
      console.error(error);
      setActionMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el grupo."
      );
    } finally {
      setIsSavingGroup(false);
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
        <p className="text-sm text-slate-600">Cargando grupo...</p>
      </section>
    );
  }

  if (errorMessage || !group) {
    return (
      <section className="space-y-6">
        <p className="text-sm text-slate-700">
          {errorMessage ?? "No se encontro el grupo."}
        </p>
        <Link
          href={routes.adminPath("groups")}
          className="inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Volver a grupos
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Link
        href={routes.adminPath("groups")}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        Volver a grupos
      </Link>

      <PageHeader
        eyebrow="Equipos y categorias"
        title={group.name}
        description={group.description?.trim() || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className={buttonClassNames({ variant: "neutral", size: "md" })}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.9} aria-hidden />
              Editar grupo
            </button>
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(true);
                setAddSearch("");
              }}
              className={buttonClassNames({ variant: "primary", size: "md" })}
            >
              <Plus className="h-4 w-4" strokeWidth={1.9} aria-hidden />
              Agregar miembros
            </button>
          </div>
        }
      />

      {actionMessage ? <Alert variant="info">{actionMessage}</Alert> : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Miembros del grupo</h2>
          <p className="mt-1 text-sm text-slate-600">
            {membersInGroup.length === 0
              ? "Todavia no hay socios asignados."
              : `${membersInGroup.length} socio(s) en este grupo.`}
          </p>
        </div>

        {membersInGroup.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Nombre</Th>
                  <Th>DNI</Th>
                  <Th>Estado</Th>
                  <Th>Accion</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {membersInGroup.map((row) => (
                  <TableRow key={row.linkId} className="hover:bg-slate-50">
                    <Td>
                      <Link
                        href={routes.adminPath(`socios/${row.member.id}`)}
                        className="font-medium text-slate-900 underline-offset-2 hover:underline"
                      >
                        {row.member.full_name}
                      </Link>
                    </Td>
                    <Td className="text-slate-700">{row.member.dni}</Td>
                    <Td>
                      {row.member.status === "active" ? (
                        <Badge variant="success">Activo</Badge>
                      ) : row.member.status === "inactive" ? (
                        <Badge variant="slate">Baja</Badge>
                      ) : (
                        <Badge variant="warning">Pendiente</Badge>
                      )}
                    </Td>
                    <Td>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => void handleRemove(row.member.id)}
                        disabled={removingKey === row.member.id}
                      >
                        {removingKey === row.member.id ? "Quitando..." : "Quitar del grupo"}
                      </Button>
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-600">
            Usa el boton Agregar miembros para sumar socios a este grupo.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Cargos del grupo</h2>
          <p className="mt-1 text-sm text-slate-600">
            {groupCharges.length === 0
              ? "No hay cargos asociados a este grupo."
              : `${groupCharges.length} cargo(s) registrado(s).`}
          </p>
        </div>

        {groupCharges.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Nombre</Th>
                  <Th>Monto</Th>
                  <Th>Vencimiento</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupCharges.map((charge) => (
                  <TableRow key={charge.id} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-900">{charge.name}</Td>
                    <Td className="tabular-nums text-slate-800">
                      {formatMoney(charge.amount)}
                    </Td>
                    <Td className="text-slate-700">
                      {formatChargeDueDate(charge.due_date)}
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-600">
            Este grupo todavia no tiene cargos asociados.
          </div>
        )}
      </section>

      <AdminModal
        open={editModalOpen}
        onClose={() => !isSavingGroup && setEditModalOpen(false)}
      >
        <h2 className="text-lg font-semibold text-white">Editar grupo</h2>
        <p className="mt-1 text-sm text-slate-300">
          Actualiza el nombre o la descripcion visible del grupo.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="edit-group-name"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Nombre <span className="text-danger">*</span>
            </label>
            <Input
              id="edit-group-name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Ej. Primera masculino"
              className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="edit-group-description"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Descripcion
            </label>
            <textarea
              id="edit-group-description"
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              placeholder="Opcional"
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="neutral"
            size="md"
            onClick={() => setEditModalOpen(false)}
            disabled={isSavingGroup}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            onClick={() => void handleUpdateGroup()}
            disabled={isSavingGroup}
          >
            {isSavingGroup ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </AdminModal>

      <AdminModal
        open={addModalOpen}
        onClose={() => addingMemberId === null && setAddModalOpen(false)}
      >
        <h2 className="text-lg font-semibold text-white">Agregar miembros</h2>
        <p className="mt-1 text-sm text-slate-300">
          Busca por nombre o DNI y suma socios activos al grupo.
        </p>

        <div className="mt-4">
          <label
            htmlFor="add-member-search"
            className="mb-1 block text-sm font-medium text-slate-300"
          >
            Buscar socio
          </label>
          <Input
            id="add-member-search"
            value={addSearch}
            onChange={(event) => setAddSearch(event.target.value)}
            placeholder="Nombre o DNI"
            className="border-white/10 bg-white/[0.05] text-sm text-white placeholder:text-slate-400 focus:border-white/20 focus:bg-white/[0.08]"
            autoComplete="off"
          />
        </div>

        <div className="mt-4 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
          {addOptions.length > 0 ? (
            addOptions.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {member.full_name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">DNI {member.dni}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAdd(member.id)}
                  disabled={addingMemberId !== null}
                  className={buttonClassNames({ variant: "primary", size: "sm" })}
                  aria-label={`Agregar a ${member.full_name}`}
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {addingMemberId === member.id ? "Agregando..." : "Agregar"}
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-4 text-sm text-slate-300">
              No hay socios activos disponibles para agregar, o no coinciden con la busqueda.
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            variant="neutral"
            size="md"
            onClick={() => setAddModalOpen(false)}
            disabled={addingMemberId !== null}
          >
            Cerrar
          </Button>
        </div>
      </AdminModal>
    </section>
  );
}
