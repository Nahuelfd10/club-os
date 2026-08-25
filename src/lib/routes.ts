import { clubConfig } from "@/config/club";

const RESERVED_ROOT_SEGMENTS = new Set(["", "_next", "api", "favicon.ico"]);

export const defaultClubSlug: string = clubConfig.slug;

export function getClubSlugFromPathname(pathname: string) {
  const [segment = ""] = pathname.replace(/^\/+/, "").split("/");

  if (RESERVED_ROOT_SEGMENTS.has(segment) || segment.includes(".")) {
    return null;
  }

  return segment || null;
}

export function clubPath(path = "", slug = defaultClubSlug) {
  const normalized = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `/${slug}${normalized}`;
}

export function adminPath(path = "", slug = defaultClubSlug) {
  const normalized = path ? `/${path.replace(/^\/+/, "")}` : "";
  return clubPath(`admin${normalized}`, slug);
}
