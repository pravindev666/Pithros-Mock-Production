import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Base URL for canonical links and OG tags.
 * Falls back to window.location.origin in dev.
 */
const SITE_URL = 'https://pithros.com';

/**
 * Route-specific metadata for public-facing pages.
 * The key is the exact pathname or a prefix pattern.
 */
const ROUTE_META: Record<
  string,
  { title: string; description: string; canonical?: string }
> = {
  '/': {
    title: 'Pithros — Digital Memorial & Remembrance Platform',
    description:
      'A permanent digital place to remember a life. Create beautiful memorials, preserve memories, life stories, photographs, and connect with trusted farewell services.',
  },
  '/memorials': {
    title: 'Explore Memorials — Pithros',
    description:
      'Browse public memorial pages on Pithros. Discover and honour the stories of loved ones through timelines, tributes, galleries, and verified biographies.',
  },
  '/how-it-works': {
    title: 'How It Works — Pithros',
    description:
      'Learn how Pithros helps families create, verify, and share digital memorials. From creating a memorial to archiving a lifetime of memories — step by step.',
  },
  '/farewell': {
    title: 'Farewell Network — Pithros',
    description:
      'Find verified funeral directors, florists, priests, and memorial service providers in the Pithros Farewell Network. Trusted, reviewed, and transparent.',
  },
  '/pricing': {
    title: 'Pricing & Plans — Pithros',
    description:
      'Choose the right Pithros memorial plan. From free tribute pages to premium verified legacy memorials with archival book exports.',
  },
  '/create-memorial': {
    title: 'Create a Memorial — Pithros',
    description:
      'Start a new memorial page on Pithros. Honour your loved one with a beautiful, permanent digital tribute.',
  },
  '/signin': {
    title: 'Sign In — Pithros',
    description: 'Sign in to your Pithros account to manage memorials and steward memories.',
  },
  '/signup': {
    title: 'Create Account — Pithros',
    description: 'Join Pithros to create, manage, and share digital memorials for your loved ones.',
  },
};

interface SEOHeadProps {
  /** Current application route (pathname) */
  route: string;
  /** Dynamic overrides — e.g. when viewing a specific memorial */
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  /** The memorial person's name (for structured data) */
  memorialName?: string;
  noindex?: boolean;
}

/**
 * Injects `<head>` meta-tags for SEO, Open Graph, and Twitter Cards.
 *
 * Static routes use the built-in ROUTE_META map.
 * Dynamic memorial pages should pass explicit title/description/ogImage props.
 */
export const SEOHead: React.FC<SEOHeadProps> = ({
  route,
  title: overrideTitle,
  description: overrideDescription,
  ogImage,
  ogType,
  memorialName,
  noindex = false,
}) => {
  // Match exact route or first prefix match
  const meta =
    ROUTE_META[route] ||
    Object.entries(ROUTE_META).find(([key]) => route.startsWith(key))?.[1];

  const title = overrideTitle || meta?.title || 'Pithros — Digital Memorial & Remembrance Platform';
  const description =
    overrideDescription ||
    meta?.description ||
    'A permanent digital place to remember a life. Create beautiful memorials, preserve memories, photographs, and connect with farewell services.';
  const canonical = `${SITE_URL}${route}`;
  const image = ogImage || `${SITE_URL}/og-image.jpg`;
  const type = ogType || 'website';

  // JSON-LD structured data
  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Pithros',
    url: SITE_URL,
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/memorials?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  // If this is a specific memorial page, add Person schema
  if (memorialName && route.startsWith('/m/')) {
    Object.assign(structuredData, {
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: memorialName,
        url: canonical,
      },
    });
  }

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {/* A noindex page must not also declare a canonical to itself. */}
      {!noindex && <link rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Pithros" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

      {/* Apple / PWA */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Pithros" />

      {/* Theme Color — matches the dark indigo brand */}
      <meta name="theme-color" content="#111820" />

      {/* Geo-targeting — India-first */}
      <meta name="geo.region" content="IN" />
      <meta name="geo.placename" content="India" />
    </Helmet>
  );
};
