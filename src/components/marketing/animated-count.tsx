"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedCountProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

const formatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function AnimatedCount({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCountProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === "undefined" || typeof requestAnimationFrame !== "function") {
      const frame = requestAnimationFrame(() => {
        setHasStarted(true);
      });

      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) {
      return;
    }

    let frame = 0;
    const duration = 1400;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [hasStarted, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatter.format(displayValue)}
      {suffix}
    </span>
  );
}
