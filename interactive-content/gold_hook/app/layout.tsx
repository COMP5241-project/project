import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gold Rush Hook — EduGenAI (PolyU) prototype",
  description:
    "A Gold Miner-style SDLC learning game in the PolyU EduGenAI house style. DO's are gold; DON'Ts are rocks.",
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
