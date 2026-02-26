// Lazy-loads per-length word sets from /public/wordle/valid-N.json (ENABLE1 dictionary).
// Module-level caches persist across renders — each length is fetched at most once.

const cache = new Map<number, Set<string>>();
const inflight = new Map<number, Promise<Set<string>>>();

export async function loadFunValidSet(length: number): Promise<Set<string>> {
  if (cache.has(length)) return cache.get(length)!;
  if (inflight.has(length)) return inflight.get(length)!;

  const p = fetch(`/wordle/valid-${length}.json`)
    .then(r => r.json() as Promise<string[]>)
    .then(words => {
      const set = new Set<string>(words);
      cache.set(length, set);
      inflight.delete(length);
      return set;
    })
    .catch(() => {
      inflight.delete(length);
      return new Set<string>();
    });

  inflight.set(length, p);
  return p;
}

export function getCachedFunValidSet(length: number): Set<string> | undefined {
  return cache.get(length);
}
