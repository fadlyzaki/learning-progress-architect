import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://learning-architect-service-423182843084.us-central1.run.app';
const SITE_NAME = 'The Autodidact Project | Learning Progress Architect';
const PRODUCT_NAME = 'Learning Progress Architect';
const DEFAULT_DESCRIPTION =
  'A calmer learning workspace that turns complex goals into structured roadmaps, focused study sessions, reviews, and reflection.';
const OG_IMAGE_URL = `${SITE_URL}/og-preview.png`;

let lastTrackedPage = '';
let hasInitializedAnalytics = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function useAppMeta({
  title,
  description = DEFAULT_DESCRIPTION,
}: {
  title: string;
  description?: string;
}) {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = title === PRODUCT_NAME ? SITE_NAME : `${title} | ${PRODUCT_NAME}`;
    const canonicalUrl = new URL(location.pathname + location.search, SITE_URL).toString();

    document.title = pageTitle;
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:site_name', SITE_NAME);
    setMetaTag('property', 'og:image', OG_IMAGE_URL);
    setMetaTag('property', 'og:image:alt', 'The Autodidact Project and Learning Progress Architect social preview card.');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', OG_IMAGE_URL);
    setCanonical(canonicalUrl);

    const trackingKey = `${location.pathname}${location.search}|${pageTitle}`;
    if (!hasInitializedAnalytics) {
      hasInitializedAnalytics = true;
      lastTrackedPage = trackingKey;
      return;
    }

    if (window.gtag && trackingKey !== lastTrackedPage) {
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: canonicalUrl,
        page_path: `${location.pathname}${location.search}`,
      });
      lastTrackedPage = trackingKey;
    }
  }, [description, location.pathname, location.search, title]);
}

export function AppMeta(props: { title: string; description?: string }) {
  useAppMeta(props);
  return null;
}

function setMetaTag(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}
