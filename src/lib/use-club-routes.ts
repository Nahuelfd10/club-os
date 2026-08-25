"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

import { adminPath, clubPath, defaultClubSlug, getClubSlugFromPathname } from "@/lib/routes";

export function useClubRoutes() {
  const pathname = usePathname();
  const slug = getClubSlugFromPathname(pathname) ?? defaultClubSlug;
  const buildClubPath = useCallback((path = "") => clubPath(path, slug), [slug]);
  const buildAdminPath = useCallback((path = "") => adminPath(path, slug), [slug]);

  return useMemo(
    () => ({
      slug,
      clubPath: buildClubPath,
      adminPath: buildAdminPath,
    }),
    [buildAdminPath, buildClubPath, slug]
  );
}
