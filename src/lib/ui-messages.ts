export const uiMessages = {
  payment: {
    duplicate: "Este mes ya esta pago.",
    createSuccess: "Pago registrado correctamente.",
    createError: "No se pudo registrar el pago.",
    deleteSuccess: "Pago eliminado correctamente.",
    deleteError: "No se pudo eliminar el pago.",
    payAllSuccess: "Se registraron todos los pagos pendientes.",
    payAllError: "No se pudo pagar toda la deuda.",
    invalidMonth: "Mes invalido. Debe ser una de las opciones sugeridas.",
    confirmCreate: (monthLabel: string) => `¿Confirmas registrar el pago de ${monthLabel}?`,
    confirmDelete: "¿Eliminar este pago?",
    confirmPayAll: (count: number) => `¿Confirmas pagar toda la deuda (${count} meses)?`,
  },
  settings: {
    noConfigId: "No hay ID de configuración para actualizar.",
    saveSuccess: "Configuracion guardada correctamente.",
    saveError: "No se pudo guardar la configuracion.",
  },
} as const;
