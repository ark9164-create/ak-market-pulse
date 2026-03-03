const freshnessMap = new Map<string, number>();

export function markFresh(source: string): void {
  freshnessMap.set(source, Date.now());
}

export function getAge(source: string): number | null {
  const timestamp = freshnessMap.get(source);
  if (timestamp === undefined) {
    return null;
  }
  return Date.now() - timestamp;
}

export function isFresh(source: string, maxAgeMs: number): boolean {
  const age = getAge(source);
  if (age === null) {
    return false;
  }
  return age <= maxAgeMs;
}

export function getAllStatus(): { source: string; age: number | null }[] {
  const entries: { source: string; age: number | null }[] = [];
  for (const [source] of freshnessMap) {
    entries.push({ source, age: getAge(source) });
  }
  return entries;
}
