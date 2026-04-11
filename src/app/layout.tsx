import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getActiveClubConfig } from "@/config/active-club";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getActiveClubConfig();
  const description = `${config.name} centraliza registro de socios, cobros y gestion administrativa con una experiencia moderna y mas clara para la comunidad del club.`;

  return {
    title: {
      default: `${config.name} | Club OS`,
      template: `%s | ${config.name}`,
    },
    description,
    openGraph: {
      title: `${config.name} | Club OS`,
      description,
      locale: "es_AR",
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getActiveClubConfig();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={
        {
          "--club-primary": config.primary_color,
          "--club-secondary": config.secondary_color,
          "--club-accent": config.accent_color,
        } as React.CSSProperties
      }
    >
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
