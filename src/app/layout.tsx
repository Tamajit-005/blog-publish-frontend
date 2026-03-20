import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import LayoutWrapper from "@/components/LayoutWrapper";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "@auth0/nextjs-auth0/client";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palette Publisher",
  description:
    "A modern blog publishing platform built with Next.js, Strapi, and Auth0.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-gray-100 min-h-screen flex flex-col`}
      >
        {/* Wrap everything with UserProvider */}
        <UserProvider>
          <Navbar />
          <main className="flex-1">
            <LayoutWrapper>{children}</LayoutWrapper>
          </main>

          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
              success: {
                duration: 3000,
                style: {
                  background: "#14b8a6",
                  color: "#0f172a",
                  fontWeight: "600",
                  padding: "16px 24px",
                  borderRadius: "8px",
                  fontSize: "15px",
                },
                iconTheme: {
                  primary: "#0f172a",
                  secondary: "#14b8a6",
                },
              },
              error: {
                duration: 4000,
                style: {
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: "600",
                  padding: "16px 24px",
                  borderRadius: "8px",
                  fontSize: "15px",
                },
                iconTheme: {
                  primary: "#fff",
                  secondary: "#ef4444",
                },
              },
              loading: {
                style: {
                  background: "#6366f1",
                  color: "#fff",
                  fontWeight: "600",
                  padding: "16px 24px",
                  borderRadius: "8px",
                  fontSize: "15px",
                },
              },
            }}
          />
        </UserProvider>
      </body>
    </html>
  );
}
