"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { BadgeCheck, CalendarDays, CreditCard, FileCheck2, MessageCircle, ReceiptText, UserRound } from "lucide-react";

type FlowStep = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
  visual: "profile" | "charge" | "payment" | "status";
};

const flowSteps: FlowStep[] = [
  {
    id: "socio",
    eyebrow: "Socio",
    title: "La ficha concentra lo que antes estaba disperso.",
    description: "Datos, contacto, grupo y estado quedan en un registro claro para operar sin perseguir informacion.",
    metric: "Ficha completa",
    visual: "profile",
  },
  {
    id: "cuota",
    eyebrow: "Cuota marzo",
    title: "El cargo aparece como una obligacion concreta.",
    description: "La cuota deja de ser un recordatorio mental y pasa a tener periodo, monto, vencimiento y responsable.",
    metric: "Cargo generado",
    visual: "charge",
  },
  {
    id: "pago",
    eyebrow: "Pago registrado",
    title: "El comprobante se valida con contexto.",
    description: "Tesoreria ve quien pago, contra que cuota aplica y que impacto tiene sobre la deuda del socio.",
    metric: "Cobro validado",
    visual: "payment",
  },
  {
    id: "estado",
    eyebrow: "Al dia",
    title: "El estado final queda visible para todos.",
    description: "Socio, cuota, pago y caja se sincronizan en una lectura simple: que esta resuelto y que falta hacer.",
    metric: "Flujo completado",
    visual: "status",
  },
];

export function ClubOsProductStory() {
  const [activeId, setActiveId] = useState(flowSteps[0]?.id ?? "");
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeStep = flowSteps.find((step) => step.id === activeId) ?? flowSteps[0];

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-story-step");

        if (id) {
          setActiveId(id);
        }
      },
      {
        rootMargin: "-26% 0px -42% 0px",
        threshold: [0.2, 0.45, 0.7],
      }
    );

    flowSteps.forEach((step) => {
      const node = itemRefs.current[step.id];
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="demo" className="clubos-story">
      <div className="clubos-story-heading">
        <p className="club-eyebrow text-sky-300/70">Flujo del sistema</p>
        <h2>Asi se ve el valor del producto en movimiento.</h2>
        <p>
          Desde el socio hasta el estado final, Club OS deja visible el recorrido que hoy suele perderse entre mensajes,
          notas y planillas.
        </p>
      </div>

      <div className="clubos-story-grid">
        <div className="clubos-story-steps">
          {flowSteps.map((step, index) => (
            <div
              key={step.id}
              ref={(node) => {
                itemRefs.current[step.id] = node;
              }}
              data-story-step={step.id}
              className={`clubos-story-step ${activeId === step.id ? "is-active" : ""}`}
            >
              <span className="clubos-story-index">{String(index + 1).padStart(2, "0")}</span>
              <p className="club-eyebrow">{step.eyebrow}</p>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <span>{step.metric}</span>
            </div>
          ))}
        </div>

        <div className="clubos-story-stage" aria-live="polite">
          <div className="clubos-story-device">
            {activeStep.visual === "profile" ? <MemberProfileVisual /> : null}
            {activeStep.visual === "charge" ? <ChargeVisual /> : null}
            {activeStep.visual === "payment" ? <PaymentVisual /> : null}
            {activeStep.visual === "status" ? <StatusVisual /> : null}
          </div>
          <div className="clubos-story-caption">
            <span>{activeStep.eyebrow}</span>
            <strong>{activeStep.metric}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemberProfileVisual() {
  return (
    <div className="clubos-flow-visual clubos-profile-visual" aria-hidden>
      <div className="clubos-profile-card">
        <div className="clubos-profile-head">
          <div className="clubos-profile-avatar">
            <UserRound className="h-8 w-8" />
          </div>
          <div>
            <span>Socio</span>
            <strong>Matias R.</strong>
          </div>
          <BadgeCheck className="h-6 w-6 text-emerald-300" />
        </div>
        <div className="clubos-profile-lines">
          <span />
          <span />
          <span />
        </div>
        <div className="clubos-profile-tags">
          <span>Infantiles</span>
          <span>Activo</span>
          <span>WhatsApp</span>
        </div>
      </div>
      <FlowRail active={0} />
    </div>
  );
}

function ChargeVisual() {
  return (
    <div className="clubos-flow-visual clubos-charge-visual" aria-hidden>
      <div className="clubos-calendar-card">
        <div className="clubos-calendar-top">
          <CalendarDays className="h-5 w-5" />
          <span>Marzo</span>
        </div>
        <div className="clubos-calendar-grid">
          {Array.from({ length: 21 }).map((_, index) => (
            <span key={index} className={index === 16 ? "is-due" : ""} />
          ))}
        </div>
      </div>
      <div className="clubos-charge-slip">
        <ReceiptText className="h-5 w-5" />
        <div>
          <span>Cuota generada</span>
          <strong>$10.000</strong>
        </div>
      </div>
      <FlowRail active={1} />
    </div>
  );
}

function PaymentVisual() {
  return (
    <div className="clubos-flow-visual clubos-payment-visual" aria-hidden>
      <div className="clubos-proof-card">
        <div className="clubos-proof-file">
          <FileCheck2 className="h-10 w-10" />
        </div>
        <div className="clubos-proof-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="clubos-validation-panel">
        <CreditCard className="h-5 w-5" />
        <span>Aplicado a cuota marzo</span>
        <strong>Validado</strong>
      </div>
      <FlowRail active={2} />
    </div>
  );
}

function StatusVisual() {
  const rows = [
    { label: "Socio", value: "Activo" },
    { label: "Cuota", value: "Pagada" },
    { label: "Caja", value: "+ $10.000" },
  ];

  return (
    <div className="clubos-flow-visual clubos-status-visual" aria-hidden>
      <div className="clubos-status-board">
        <div className="clubos-status-header">
          <BadgeCheck className="h-7 w-7" />
          <div>
            <span>Estado final</span>
            <strong>Al dia</strong>
          </div>
        </div>
        <div className="clubos-status-rows">
          {rows.map((row, index) => (
            <div key={row.label} style={{ "--row-delay": `${index * 130}ms` } as CSSProperties}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="clubos-message-chip">
        <MessageCircle className="h-4 w-4" />
        <span>Recordatorio ya no necesario</span>
      </div>
      <FlowRail active={3} />
    </div>
  );
}

function FlowRail({ active }: { active: number }) {
  return (
    <div className="clubos-flow-rail">
      {flowSteps.map((step, index) => (
        <span key={step.id} className={index <= active ? "is-active" : ""} />
      ))}
    </div>
  );
}
