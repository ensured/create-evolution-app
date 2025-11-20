import { Metadata } from "next";
import { Footer } from "@/components/Footer";
import ToS from "@/components/ToS";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review Depth Oracle's terms of service to understand the guidelines and policies for using our AI-powered Jungian psychology platform.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "https://depth-oracle.vercel.app/docs/terms",
  },
};

const page = () => {
  return (
    <div>
      <ToS />
      <Footer />
    </div>
  );
};

export default page;
