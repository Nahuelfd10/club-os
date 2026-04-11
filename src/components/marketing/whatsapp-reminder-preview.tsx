import { MessageCircleMore } from "lucide-react";

export function WhatsAppReminderPreview() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/70">Cobros y seguimiento</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Recordatorios que conectan con el problema real del club.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
            Cuando la landing muestra un ejemplo concreto de seguimiento, el producto se vuelve mucho mas entendible y tangible.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
          Caso de uso real
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-white/10 bg-black/18 p-4">
            <p className="text-sm font-semibold text-white">Deja de depender solo de mensajes improvisados y seguimiento manual.</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              El recordatorio puede salir desde un estado claro del sistema y llevar al club a una gestion mucho mas prolija.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-black/18 p-4">
            <p className="text-sm font-semibold text-white">Una sola accion, multiples senales de valor.</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Cobro pendiente, alias visible, tono cercano y contexto suficiente para que el socio entienda rapido que tiene que hacer.
            </p>
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-white/10 bg-[#0b141a] p-4 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-3 rounded-[1.2rem] bg-[#111b21] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/18 text-emerald-300">
              <MessageCircleMore className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Recordatorio de cuota</p>
              <p className="text-xs text-slate-400">Club OS · WhatsApp</p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.2rem] bg-[#0f1e26] p-4">
            <div className="mb-3 flex items-center gap-1.5 text-slate-400">
              <span className="clubos-typing-dot h-2 w-2 rounded-full bg-slate-500" />
              <span className="clubos-typing-dot clubos-typing-dot-delay h-2 w-2 rounded-full bg-slate-500" />
              <span className="clubos-typing-dot clubos-typing-dot-delay-2 h-2 w-2 rounded-full bg-slate-500" />
              <span className="ml-2 text-xs">Escribiendo...</span>
            </div>

            <div className="clubos-chat-bubble rounded-[1.2rem] bg-[#202c33] px-4 py-3 text-sm leading-6 text-slate-100">
              Hola! Tenes pendiente la cuota de marzo del club 🙌
              <br />
              Alias: <span className="font-semibold text-emerald-300">club.os.mp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
