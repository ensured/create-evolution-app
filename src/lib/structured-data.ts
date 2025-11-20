// Structured Data Schema Types
type Organization = {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  logo: string;
  sameAs?: string[];
};

type WebSite = {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  potentialAction: {
    "@type": string;
    target: {
      "@type": string;
      urlTemplate: string;
    };
    "query-input": string;
  };
};

export function getOrganizationSchema(): Organization {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Depth Oracle",
    description:
      "AI-powered Jungian psychology companion for personal growth and self-discovery",
    url: "https://depth-oracle.vercel.app",
    logo: "https://depth-oracle.vercel.app/og-image.png",
    sameAs: [
      // Add your social media profiles here when available
      // "https://twitter.com/depthoracle",
      // "https://linkedin.com/company/depthoracle",
    ],
  };
}

export function getWebSiteSchema(): WebSite {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Depth Oracle",
    description:
      "Transform your self-awareness with AI-powered Jungian psychology tools",
    url: "https://depth-oracle.vercel.app",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://depth-oracle.vercel.app/?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function getSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Depth Oracle",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "AI-powered Jungian psychology companion featuring shadow work, archetypal insights, and personal growth tools",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "1",
    },
  };
}
