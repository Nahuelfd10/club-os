# Modelo de producto - Cobros primero

Ultima revision: 2026-05-10.

Club OS se organiza alrededor de una pregunta operativa: **quien debe pagar, por que, cuanto pago, cuanto falta y que accion sigue**.

## Principios

- **Cuota mensual** es el flujo principal y recurrente.
- **Cobros** agrupa cuota, cobros a socios y pedidos.
- La diferencia de **tipo de cobro** solo debe existir cuando cambia la herramienta disponible.
- **Pedidos / indumentaria** son cobros con lineas variables: talle, cantidad, socio o comprador externo.
- Inscripcion, matricula, viaje, torneo u otros conceptos simples son categorias de un mismo flujo: crear deuda para personas.
- **Caja** muestra ingresos reales desde pagos y egresos manuales. Caja no crea deuda.
- **Grupos** son atajos para asignar cobros, pero siempre debe existir la opcion de elegir personas puntuales.
- La UI debe hablarle a un tesorero no tecnico: cobro, pedido, linea, pago, deuda, egreso.

## Navegacion admin

- **Socios**: padron, solicitudes y deuda por persona.
- **Cobros**: cuota mensual, cobros simples, pedidos e importacion de planillas.
- **Caja**: ingresos, egresos y balance mensual.
- **Grupos**: organizacion de socios para acelerar asignaciones.
- **Ajustes**: identidad, cuota, alias, logo, sponsors y email.

## Automatizacion v1

- WhatsApp sigue siendo manual: mensajes listos para abrir/copiar, sin envios automaticos.
- La cuota mensual se genera por automatizacion existente en Supabase.
- La importacion de Excel debe mostrar preview y sugerir coincidencias con socios antes de confirmar.

## Criterio para nuevos tipos

Un nuevo tipo no se agrega solo por nombre o categoria. Se agrega cuando desbloquea una experiencia especifica.

Ejemplos:

- **Pedido / indumentaria**: habilita talles, cantidades, compradores externos e importacion/exportacion de Excel.
- **Rifa** futura: podria habilitar una grilla de numeros vendidos, reservados, cobrados y pendientes.
- **Inscripcion / matricula**: por ahora no necesita flujo propio; vive dentro de Cobro a socios como categoria para reportes.

## Escala futura

El producto queda preparado en lenguaje y configuracion para venderse a otros clubes, pero no agrega multi-club real ni `club_id` todavia.
