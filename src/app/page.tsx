import { Metadata } from "next";
import ClientWrapper from "@/components/ClientWrapper";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Discover profound self-awareness through AI-powered Jungian psychology. Chat with Elara for shadow work, archetypal insights, dream analysis, and personalized guidance on your journey to wholeness.",
  openGraph: {
    title: "Depth Oracle - Unveil Your Depths with AI-Powered Jungian Psychology",
    description:
      "Transform your self-awareness with Elara, your AI Jungian companion. Explore shadow work, archetypes, and personal growth.",
    url: "https://depth-oracle.vercel.app",
  },
  alternates: {
    canonical: "https://depth-oracle.vercel.app",
  },
};

export default function Home() {
  return <ClientWrapper />;
}
