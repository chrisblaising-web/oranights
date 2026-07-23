import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://oranights.vercel.app"),
  title: "WKND Presents | Ora Nights Guest List",
  description: "Join the official Ora Nights guest list.",
  openGraph: {
    title: "WKND Presents | Ora Nights Guest List",
    description: "Join the official Ora Nights guest list.",
    url: "/f/ora-night-guest-list",
    siteName: "WKND Presents",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WKND Presents | Ora Nights Guest List",
    description: "Join the official Ora Nights guest list.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}