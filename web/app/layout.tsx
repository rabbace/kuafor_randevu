import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Kuaför Randevu | Yönetim Paneli",
  description: "Salon yönetim paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} min-h-screen antialiased font-sans bg-neutral-50 text-neutral-900`}>
        {children}
      </body>
    </html>
  );
}
