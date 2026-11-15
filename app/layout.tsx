import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Urbanist } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/config";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WALOOP — Book a Demo | Contact & Social",
  description: `${brand.tagline} ${brand.description} Call, WhatsApp, or book a free 30-minute Google Meet demo.`,
  openGraph: {
    title: "WALOOP — Book a free demo",
    description: brand.description,
    images: ["/brand/waloop-logo-light.png"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f7fb",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${urbanist.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
