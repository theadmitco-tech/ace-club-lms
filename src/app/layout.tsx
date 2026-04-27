import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "Ace Club — GMAT Learning Platform",
  description: "Structured GMAT preparation with session-wise materials, pre-reads, worksheets, and video content. Ace your GMAT with guided learning.",
  keywords: "GMAT, GMAT prep, MBA, test prep, Ace Club, learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
