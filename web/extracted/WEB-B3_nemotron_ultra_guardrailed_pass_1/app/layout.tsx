// app/layout.tsx (or your root layout)
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Application",
  description: "Secure, accessible web application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "About", href: "/about" },
  ];

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Navbar
          brand="Acme"
          brandHref="/"
          links={navLinks}
          cta={{ label: "Get Started", href: "/signup" }}
        />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}