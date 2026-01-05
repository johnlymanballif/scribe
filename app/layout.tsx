import type { Metadata } from "next";
import { Inter, Fragment_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const fragmentMono = Fragment_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Scribe",
  description: "Meeting notes, formatted for Notion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable + " " + fragmentMono.variable + " font-sans"}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
