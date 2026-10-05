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

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "outcomes",
    label: "Career Outcomes & Industry Reputation",
    weight: 0.35,
    metrics: [
      { path: "outcomes.startingSalary", weight: 15 / 35, direction: "higherIsBetter" },
      { path: "outcomes.employmentRate", weight: 10 / 35, direction: "higherIsBetter" },
      { path: "outcomes.recruiterReputationScore", weight: 10 / 35, direction: "higherIsBetter" },
    ],
  },
  {
    key: "academicResearch",
    label: "Academic Research & Faculty Quality",
    weight: 0.3,
    metrics: [
      { path: "academicResearch.facultyPubCitationIndex", weight: 15 / 30, direction: "higherIsBetter" },
      { path: "academicResearch.facultyStudentRatio", weight: 7 / 30, direction: "lowerIsBetter" },
      { path: "academicResearch.researchFundingUSD", weight: 5 / 30, direction: "higherIsBetter" },
      { path: "academicResearch.hasPhDProgram", weight: 3 / 30, direction: "higherIsBetter" },
    ],
  },
  {
    key: "admissions",
    label: "Admissions Selectivity",
    weight: 0.2,
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
