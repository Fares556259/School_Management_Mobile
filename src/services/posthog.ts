import PostHog from 'posthog-react-native';

export const POSTHOG_API_KEY = 'phc_uDBSEzp3vFG4S33yQkqfTw4hUuY7MEXEhCKHrHYpSkme';
export const POSTHOG_HOST = 'https://eu.i.posthog.com';

export const posthog = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 10000,
  enableSessionReplay: false, // Can be enabled when needed
});

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    console.warn('[PostHog] trackEvent failed:', err);
  }
};

export const trackScreen = (screenName: string, properties?: Record<string, any>) => {
  try {
    posthog.screen(screenName, properties);
  } catch (err) {
    console.warn('[PostHog] trackScreen failed:', err);
  }
};

export const identifyUser = (userId: string, userProperties?: Record<string, any>) => {
  try {
    posthog.identify(userId, userProperties);
  } catch (err) {
    console.warn('[PostHog] identifyUser failed:', err);
  }
};

export const resetUser = () => {
  try {
    posthog.reset();
  } catch (err) {
    console.warn('[PostHog] resetUser failed:', err);
  }
};
