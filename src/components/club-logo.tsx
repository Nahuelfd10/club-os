import { Shield } from "lucide-react";

type ClubLogoProps = {
  /** URL del logo; vacío o sin definir muestra el escudo por defecto. */
  src?: string | null;
  alt: string;
  className?: string;
};

/** Logo del club (URL absoluta o path en /public). Si no hay logo, mismo espacio con icono escudo. */
export function ClubLogo({ src, alt, className = "" }: ClubLogoProps) {
  const url = src?.trim();

  if (!url) {
    return (
      <div
        className={`inline-flex aspect-square shrink-0 items-center justify-center object-contain text-slate-500 ${className}`.trim()}
        role="img"
        aria-label={alt}
      >
        <Shield className="h-[58%] w-[58%] min-h-3 min-w-3" strokeWidth={1.65} aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`object-contain ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}
