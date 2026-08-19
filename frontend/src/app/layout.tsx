import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AutoCare AI - Vehicle Service & Maintenance SaaS",
  description: "Next-Gen AI-Powered Automotive Service & Multi-Tenant Workshop Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-[100dvh] flex flex-col antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
