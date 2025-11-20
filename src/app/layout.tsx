import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import {
  getOrganizationSchema,
  getWebSiteSchema,
  getSoftwareApplicationSchema,
} from "@/lib/structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://depth-oracle.vercel.app"),
  title: {
    default: "Depth Oracle - AI Jungian Psychology Companion",
    template: "%s | Depth Oracle",
  },
  description:
    "Transform your self-awareness with AI-powered Jungian psychology tools. Explore archetypes, shadow work, and personal growth with Elara, your AI companion.",
  keywords: [
    "Jungian psychology",
    "shadow work",
    "AI therapy",
    "personal growth",
    "self-discovery",
    "archetypes",
    "individuation",
    "emotional intelligence",
    "active imagination",
    "dream analysis",
    "anima animus",
    "persona",
    "collective unconscious",
  ],
  authors: [{ name: "Depth Oracle Team" }],
  creator: "Depth Oracle Team",
  publisher: "Depth Oracle",
  icons: {
    icon: "/lucid-evolution-al-red.svg",
    apple: "/og-image.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Depth Oracle - AI Jungian Psychology Companion",
    description:
      "Transform your self-awareness with AI-powered Jungian psychology tools. Explore archetypes, shadow work, and personal growth with Elara.",
    url: "https://depth-oracle.vercel.app",
    siteName: "Depth Oracle",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Depth Oracle - AI Jungian Psychology Companion",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Depth Oracle - AI Jungian Psychology Companion",
    description:
      "Transform your self-awareness with AI-powered Jungian psychology tools. Explore archetypes, shadow work, and personal growth.",
    images: ["/og-image.png"],
    creator: "@depthoracle",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://depth-oracle.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebSiteSchema();
  const softwareSchema = getSoftwareApplicationSchema();

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link
            rel="icon"
            href="/lucid-evolution-al-red.svg"
            type="image/svg+xml"
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationSchema),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(websiteSchema),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(softwareSchema),
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Header />
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
