import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "dbclass",
  description: "SQL interfaces for HW questions",
};

const geistSans = GeistSans.variable;
const geistMono = GeistMono.variable;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans} ${geistMono} antialiased dark`}>
      <body>{children}</body>
    </html>
  );
}
