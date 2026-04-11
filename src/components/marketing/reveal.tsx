"use client";

import { HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";

type RevealProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  delayMs?: number;
};

export function Reveal({ children, className = "", delayMs = 0, style, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-in ${isVisible ? "is-visible" : ""} ${className}`.trim()}
      style={{ ...style, transitionDelay: `${delayMs}ms` }}
      {...rest}
    >
      {children}
    </div>
  );
}
