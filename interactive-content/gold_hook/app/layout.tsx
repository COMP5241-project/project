import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Welcome to COMP 5241 — Gold Rush Hook",
  description:
    "Warm up for COMP 5241 with Gold Rush Hook, a game about the dos and don'ts of the Software Development Life Cycle.",
  keywords: ["SDLC", "EduGenAI", "PolyU", "game", "gold miner", "software engineering"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F8F9FA",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* Tailwind default sans (system-ui) per EduGenAI README §1. */}
      <body className="antialiased">{children}</body>
    </html>
  );
}
