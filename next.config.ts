import type { NextConfig } from "next";

import { clubConfig } from "./src/config/club";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        // Antes había una /registro que sólo redirigía con router.replace.
        // Lo movemos a redirect server-side (más rápido, sin flash de loading).
        source: "/registro",
        destination: `/${clubConfig.slug}/registro`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
