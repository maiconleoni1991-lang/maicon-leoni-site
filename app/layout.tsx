import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const assetBasePath = isGitHubPages ? "/maicon-leoni-site" : "";
const siteUrl = isGitHubPages
  ? "https://maiconleoni1991-lang.github.io/maicon-leoni-site"
  : "https://maicon-leoni.maiconleoni1991.chatgpt.site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maicon Leoni | Produtor Musical",
  description: "Site oficial de Maicon Leoni. Músicas gospel, canções personalizadas e novos lançamentos.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Maicon Leoni",
    title: "Maicon Leoni | Produtor Musical",
    description: "Músicas gospel, canções personalizadas e novos lançamentos de Maicon Leoni.",
    images: [
      {
        url: `${siteUrl}/maicon-leoni-social-cover.jpg`,
        width: 1702,
        height: 630,
        alt: "Maicon Leoni — Criação e Produção Musical",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maicon Leoni | Produtor Musical",
    description: "Músicas gospel, canções personalizadas e novos lançamentos de Maicon Leoni.",
    images: [`${siteUrl}/maicon-leoni-social-cover.jpg`],
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: `${assetBasePath}/maicon-leoni-logo-transparent.png`,
    shortcut: `${assetBasePath}/maicon-leoni-logo-transparent.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
