import type { Metadata } from "next";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";

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

const clubDisplay = Bebas_Neue({
  variable: "--font-club-display",
  weight: "400",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const description =
    "Club OS es una plataforma para clubes deportivos que conecta landing institucional, registro de socios y gestion administrativa en una sola experiencia.";

  return {
    title: {
      default: "Club OS",
      template: `%s | Club OS`,
    },
    description,
    openGraph: {
      title: "Club OS",
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
      className={`${geistSans.variable} ${geistMono.variable} ${clubDisplay.variable} h-full antialiased`}
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
