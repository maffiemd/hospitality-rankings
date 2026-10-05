import { CATEGORIES } from "../config/weights.js";
import { minMaxNormalize, weightedAverage } from "./normalize.js";
import type { Program } from "./schema.js";
import type { CategoryScore, MetricScore, RankingsOutput, ScoredProgram } from "./types.js";

function getByPath(obj: unknown, path: string): number | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  if (value && typeof value === "object" && "value" in (value as Record<string, unknown>)) {
    return (value as { value?: number }).value;
  }
  return undefined;
}

const TIE_EPSILON = 1e-6;

/**
 * Computes normalized metric/category/composite scores and ranks for a set
 * of programs. Pure function of its input — re-running with the same
 * programs always produces the same output, which is what makes the
 * pipeline deterministic and re-runnable after editing source data.
 */
export function scorePrograms(programs: Program[]): RankingsOutput {
  const rawByPath = new Map<string, number[]>();
  for (const category of CATEGORIES) {
    for (const m of category.metrics) {
      const values = programs
        .map((p) => getByPath(p, m.path))
        .filter((v): v is number => v !== undefined);
      rawByPath.set(m.path, values);
    }
  }

  const scored: Omit<ScoredProgram, "rank">[] = programs.map((program) => {
    let totalMetrics = 0;
    let presentMetrics = 0;

    const categories: CategoryScore[] = CATEGORIES.map((category) => {
      const metricScores: MetricScore[] = category.metrics.map((m) => {
        totalMetrics += 1;
        const rawValue = getByPath(program, m.path) ?? null;
        if (rawValue !== null) presentMetrics += 1;

        const field = rawByPath.get(m.path) ?? [];
        let normalized: number | null = null;
        if (rawValue !== null && field.length > 0) {
          const min = Math.min(...field);
          const max = Math.max(...field);
          normalized = minMaxNormalize(rawValue, min, max, m.direction);
        }
        return { path: m.path, rawValue, normalized };
      });

      const score = weightedAverage(
        category.metrics.map((m, i) => ({ value: metricScores[i].normalized, weight: m.weight })),
      );

      return { key: category.key, label: category.label, score, metrics: metricScores };
    });

    const compositeScore = weightedAverage(
      CATEGORIES.map((category, i) => ({ value: categories[i].score, weight: category.weight })),
    );

    const dataCompleteness = totalMetrics === 0 ? 0 : presentMetrics / totalMetrics;

    return { program, categories, compositeScore, dataCompleteness };
  });

  const ranked = [...scored].sort((a, b) => (b.compositeScore ?? -Infinity) - (a.compositeScore ?? -Infinity));

  const rankings: ScoredProgram[] = [];
  let rank = 0;
  let previousScore: number | null = null;
  for (const entry of ranked) {
    if (entry.compositeScore === null) {
      rankings.push({ ...entry, rank: null });
      continue;
    }
    if (previousScore === null || Math.abs(entry.compositeScore - previousScore) > TIE_EPSILON) {
      rank += 1;
    }
    previousScore = entry.compositeScore;
    rankings.push({ ...entry, rank });
  }

  return { generatedAt: new Date().toISOString(), programCount: programs.length, rankings };
}
