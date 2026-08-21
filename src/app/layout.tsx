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
  title: "Hackathons · Superteam Brasil",
  description:
    "Plataforma de hackathons da Superteam Brasil. Participe, monte seu time e submeta seu projeto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}