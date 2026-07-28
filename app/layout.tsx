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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://oranights.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default:
      "WKND Presents | Official Ora Nights Guest List",
    template: "%s | WKND Presents",
  },

  description:
    "Register for the official Ora Nights guest list by WKND Presents in Montréal.",

  applicationName: "WKND Presents",
  category: "events",

  keywords: [
    "Ora Nights",
    "WKND Presents",
    "Montréal events",
    "guest list",
    "ZAMA Montréal",
  ],

  authors: [
    {
      name: "WKND Presents",
    },
  ],

  creator: "WKND Presents",
  publisher: "WKND Presents",

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title:
      "Official Ora Nights Guest List | WKND Presents",
    description:
      "Register for the official Ora Nights guest list by WKND Presents in Montréal.",
    url: "/f/ora-night-guest-list",
    siteName: "WKND Presents",
    locale: "en_CA",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Official Ora Nights Guest List | WKND Presents",
    description:
      "Register for the official Ora Nights guest list by WKND Presents in Montréal.",
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
      <body className="flex min-h-full flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}
