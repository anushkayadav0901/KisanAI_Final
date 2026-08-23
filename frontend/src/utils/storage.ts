const NAMESPACE = "kisanai";
const DEFAULT_EXPIRY_HOURS = 24;

const keyFor = (feature: string) => `${NAMESPACE}:${feature}:result`;

export function saveResult(
  feature: string,
  value: unknown,
  expiryHours: number = DEFAULT_EXPIRY_HOURS,
) {
  const payload = JSON.stringify({
    v: value,
    exp: Date.now() + expiryHours * 60 * 60 * 1000,
  });
  try {
    localStorage.setItem(keyFor(feature), payload);
  } catch (err) {
    console.warn(`[storage] could not cache "${feature}":`, err);
  }
}

export function loadResult<T>(feature: string): T | null {
  const raw = localStorage.getItem(keyFor(feature));
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  if (Date.now() > parsed.exp) {
    localStorage.removeItem(keyFor(feature));
    return null;
  }
  return parsed.v as T;
}

export function clearFeature(feature: string) {
  localStorage.removeItem(keyFor(feature));
}
