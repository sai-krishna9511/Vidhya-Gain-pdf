import posthog from 'posthog-js';

// Initialize PostHog lazily
let isInitialized = false;

export function initAnalytics() {
  if (isInitialized) return;

  const key = (import.meta as any).env?.VITE_POSTHOG_KEY || '';
  const host = (import.meta as any).env?.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (key) {
    posthog.init(key, {
      api_host: host,
      loaded: (ph) => {
        console.log('[Analytics] PostHog loaded successfully');
      },
      capture_pageview: true,
      persistence: 'localStorage'
    });
    isInitialized = true;
  } else {
    console.log('[Analytics] PostHog is disabled (VITE_POSTHOG_KEY missing). Operating in development log mode.');
  }
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // Always log to console in dev mode
  console.log(`[Analytics] Event tracked: "${eventName}"`, properties || {});

  if (isInitialized) {
    posthog.capture(eventName, properties);
  }
}
