let cleanup: (() => Promise<void>) | undefined;
export function registerAccountCleanup(handler: () => Promise<void>) { cleanup = handler; }
export async function clearAccountData() { await cleanup?.(); }
