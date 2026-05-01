import type { NextConfig } from "next";

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
        destination: "/club/registro",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
