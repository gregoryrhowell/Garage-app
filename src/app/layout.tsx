import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SeedGate } from "@/components/SeedGate";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Garage — Workout Tracker",
  description: "Offline-first mesocycle workout tracker.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Garage",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <ServiceWorker />
        <SeedGate>{children}</SeedGate>
      </body>
    </html>
  );
}
