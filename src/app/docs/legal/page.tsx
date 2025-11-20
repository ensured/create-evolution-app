import { Metadata } from "next";
import PrivacyPolicy from "@/components/PrivacyPolicy";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read Depth Oracle's privacy policy to understand how we protect your data and respect your privacy while you explore Jungian psychology tools.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "https://depth-oracle.vercel.app/docs/legal",
  },
};

const page = () => {
  return (
    <div>
      <PrivacyPolicy />
      <Footer />
    </div>
  );
};

export default page;
