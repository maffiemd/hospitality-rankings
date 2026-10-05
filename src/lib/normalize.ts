import type { MetricDirection } from "../config/weights.js";

/**
 * Min-max scale `value` to 0-100 against the field's [min, max], inverting
 * the scale when lower raw values are better. When the field has no spread
 * (min === max, including a field of exactly one program) there is nothing
 * to differentiate on, so every program is scored 100 for that metric
 * rather than divided-by-zero or arbitrarily penalized.
 */
export function minMaxNormalize(
  value: number,
  min: number,
  max: number,
  direction: MetricDirection,
): number {
  if (max === min) return 100;
  const pct = (value - min) / (max - min);
  const oriented = direction === "higherIsBetter" ? pct : 1 - pct;
  return oriented * 100;
}

/** Weighted average of `[value, weight]` pairs, re-weighting over only the present values. */
export function weightedAverage(pairs: Array<{ value: number | null; weight: number }>): number | null {
  const present = pairs.filter((p): p is { value: number; weight: number } => p.value !== null);
  const totalWeight = present.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight === 0) return null;
  const weightedSum = present.reduce((sum, p) => sum + p.value * p.weight, 0);
  return weightedSum / totalWeight;
}
