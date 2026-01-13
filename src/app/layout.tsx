import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/app-shell";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Glossary and Topics",
  description: "Glossary and Topic management UI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

