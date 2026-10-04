// Analytics disabled: no SDK initialization, user identification or event transmission.
// Keep these functions so existing callers remain compatible.
export const trackEvent = (_eventName: string, _properties?: Record<string, any>) => {};
export const trackScreen = (_screenName: string, _properties?: Record<string, any>) => {};
export const identifyUser = (_userId: string, _properties?: Record<string, any>) => {};
export const resetUser = () => {};
