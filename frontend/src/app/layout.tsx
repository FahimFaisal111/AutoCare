import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AutoCare AI - Multi-Tenant Automotive Intelligence SaaS",
  description: "Next-Gen AI-Powered Automotive Service & Multi-Tenant Workshop Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f6f9fc] text-[#0a2540] min-h-[100dvh] flex flex-col antialiased selection:bg-[#635bff]/20 selection:text-[#635bff]">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 py-8 md:py-14">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
