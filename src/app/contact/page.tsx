import { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Depth Oracle team. Have questions about our AI-powered Jungian psychology tools? We're here to help you on your journey to self-discovery.",
  openGraph: {
    title: "Contact Depth Oracle - We're Here to Help",
    description:
      "Have questions about Depth Oracle? Reach out to our team for support and guidance.",
    url: "https://depth-oracle.vercel.app/contact",
  },
  alternates: {
    canonical: "https://depth-oracle.vercel.app/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <div className="container mx-auto pt-20 pb-10 px-2.5 sm:px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about Depth Oracle or need support? We&apos;d love to
            hear from you. Fill out the form below and we&apos;ll get back to
            you as soon as possible.
          </p>
        </div>
        <ContactForm />
      </div>
      <Footer />
    </>
  );
}
