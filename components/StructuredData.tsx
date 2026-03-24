export default function StructuredData() {
  const webApplication = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "FPL Companion",
    url: "https://fplcompanion.co.uk",
    description:
      "AI-powered Fantasy Premier League points predictor with squad optimisation, fixture analysis, player comparison, and live gameweek tracking.",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
    },
    featureList: [
      "AI-powered points predictions",
      "Automatic best XI selection",
      "Multi-gameweek fixture analysis",
      "Side-by-side player comparison",
      "Live gameweek tracking",
      "One-click FPL squad import",
      "Captain pick recommendations",
      "Transfer planning tools",
    ],
  };

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FPL Companion",
    url: "https://fplcompanion.co.uk",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
      bestRating: "5",
    },
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FPL Companion",
    url: "https://fplcompanion.co.uk",
    logo: "https://fplcompanion.co.uk/icon.svg",
    sameAs: [],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is FPL Companion?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FPL Companion is a free AI-powered tool for Fantasy Premier League managers. It provides predicted points, optimal squad selection, fixture analysis, player comparisons, and live gameweek tracking to help you climb your mini-league.",
        },
      },
      {
        "@type": "Question",
        name: "How does FPL Companion predict points?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FPL Companion uses a combination of FPL's expected points data, betting odds, team strength ratings, player form analysis, fixture difficulty, and momentum tracking to generate accurate per-player points predictions for upcoming gameweeks.",
        },
      },
      {
        "@type": "Question",
        name: "Is FPL Companion free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, FPL Companion is completely free to use. There are no premium tiers or hidden charges. All features including AI predictions, squad optimisation, and live tracking are available to every user.",
        },
      },
      {
        "@type": "Question",
        name: "How do I import my FPL team?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Simply enter your FPL Team ID (found on the official FPL website under your team URL) and FPL Companion will instantly import your full squad with current prices, ownership data, and predicted points.",
        },
      },
      {
        "@type": "Question",
        name: "Does FPL Companion work during live gameweeks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. FPL Companion provides live points tracking during active gameweeks, showing real-time scores for your players, live fixture results, and updated league standings as matches are played.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
