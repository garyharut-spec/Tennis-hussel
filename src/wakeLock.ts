let sentinel: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  if (!navigator.wakeLock) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
  } catch {
    sentinel = null;
  }
}

export function releaseWakeLock(): void {
  sentinel?.release().catch(() => undefined);
  sentinel = null;
}
