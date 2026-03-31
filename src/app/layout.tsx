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

  return {
    title: `Club OS - ${config.name}`,
    description: "Base modular para gestion de clubes deportivos",
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
