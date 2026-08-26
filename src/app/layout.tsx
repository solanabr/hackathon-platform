import type { Metadata } from "next";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport = {
  themeColor: "#f7eacb",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://hackathon.superteam.com.br"),
  title: {
    default: "Hackathons · Superteam Brasil",
    template: "%s · Superteam Brasil",
  },
  description:
    "Plataforma de hackathons da Superteam Brasil. Participe, monte seu time e submeta seu projeto.",
  openGraph: {
    siteName: "Superteam Brasil",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/brand/og-hub.png", width: 2400, height: 1260 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}