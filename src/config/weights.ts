/**
 * Single tunable source of truth for the ranking methodology.
 * Edit weights/directions here and re-run `npm run build:rankings` — no
 * changes to scoring logic are needed.
 */

export type MetricDirection = "higherIsBetter" | "lowerIsBetter";

export interface MetricWeightConfig {
  /** dot-path into the Program object, e.g. "outcomes.startingSalary" */
  path: string;
  /** weight within its category; category weights are normalized to sum to 1 */
  weight: number;
  direction: MetricDirection;
}

export interface CategoryConfig {
  key: string;
  label: string;
  /** weight of this category in the overall composite score; all categories sum to 1 */
  weight: number;
  metrics: MetricWeightConfig[];
}

/**
 * A program needs at least this fraction of tracked metrics sourced to
 * receive a numeric rank. Below this, a composite score computed from one
 * or two populated metrics (e.g. a single "has PhD program" flag) is not a
 * meaningful comparison — the program is still scored and shown, but as
 * unranked pending more data, rather than letting data sparsity itself
 * produce a misleadingly high rank.
 */
export const MIN_COMPLETENESS_FOR_RANK = 0.3;

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "outcomes",
    label: "Career Outcomes & Industry Reputation",
    weight: 0.3,
    metrics: [
      { path: "outcomes.startingSalary", weight: 15 / 35, direction: "higherIsBetter" },
      { path: "outcomes.employmentRate", weight: 10 / 35, direction: "higherIsBetter" },
      { path: "outcomes.recruiterReputationScore", weight: 10 / 35, direction: "higherIsBetter" },
    ],
  },
  {
    key: "academicResearch",
    label: "Academic Research & Faculty Quality",
    weight: 0.25,
    metrics: [
      { path: "academicResearch.facultyPubCitationIndex", weight: 0.65, direction: "higherIsBetter" },
      { path: "academicResearch.researchFundingUSD", weight: 0.22, direction: "higherIsBetter" },
      { path: "academicResearch.hasPhDProgram", weight: 0.13, direction: "higherIsBetter" },
    ],
  },
  {
    key: "academicQuality",
    label: "Academic Quality & Completion",
    weight: 0.15,
    metrics: [
      { path: "academicQuality.sixYearGraduationRate", weight: 0.4, direction: "higherIsBetter" },
      { path: "academicQuality.retentionRate", weight: 0.3, direction: "higherIsBetter" },
      { path: "academicQuality.facultyStudentRatio", weight: 0.3, direction: "lowerIsBetter" },
    ],
  },
  {
    key: "admissions",
    label: "Admissions Selectivity",
    weight: 0.15,
    metrics: [
      { path: "admissions.acceptanceRate", weight: 10 / 20, direction: "lowerIsBetter" },
      { path: "admissions.satActEquivalent", weight: 10 / 20, direction: "higherIsBetter" },
    ],
  },
  {
    key: "placement",
    label: "Internship / Placement Pipeline",
    weight: 0.15,
    metrics: [
      { path: "outcomes.internshipPlacementRate", weight: 1, direction: "higherIsBetter" },
    ],
  },
];
