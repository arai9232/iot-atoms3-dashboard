export const RANGE_OPTIONS = [
  { value: "1d", label: "1日", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "1週間", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "1か月", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

export type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

export function rangeMs(value: string): number {
  return RANGE_OPTIONS.find((o) => o.value === value)?.ms ?? RANGE_OPTIONS[0].ms;
}
