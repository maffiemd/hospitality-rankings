import type { Program } from "./schema.js";

export interface MetricScore {
  path: string;
  rawValue: number | null;
  normalized: number | null; // 0-100, null if missing or no spread in the field
}

export interface CategoryScore {
  key: string;
  label: string;
  score: number | null; // 0-100
  metrics: MetricScore[];
}

export interface ScoredProgram {
  program: Program;
  categories: CategoryScore[];
  compositeScore: number | null; // 0-100
  rank: number | null; // null if compositeScore is null (no usable data)
  dataCompleteness: number; // fraction [0,1] of metrics that had a value present
}

export interface RankingsOutput {
  generatedAt: string; // ISO timestamp
  programCount: number;
  rankings: ScoredProgram[];
}
