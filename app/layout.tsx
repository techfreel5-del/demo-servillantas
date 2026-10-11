import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreHydration } from "@/lib/store-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RodaMax Llantas - E-Commerce + ERP Demo",
  description: "Plataforma E-commerce B2C de llantas con integracion ERP, CFDI 4.0 y arquitectura orientada a eventos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <StoreHydration>{children}</StoreHydration>
      </body>
    </html>
  );
}
