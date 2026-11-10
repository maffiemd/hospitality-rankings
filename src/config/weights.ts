/**
 * Single tunable source of truth for the ranking methodology.
 * Edit weights/directions here and re-run `npm run build:rankings` — no
 * changes to scoring logic are needed.
 */

export type MetricDirection = "higherIsBetter" | "lowerIsBetter";

export interface MetricWeightConfig {
  /** dot-path into the Program object, e.g. "outcomes.startingSalary" */
  path: string;
  /** short human-readable name, used for the methodology table and sub-weight sliders */
  label: string;
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
export const MIN_COMPLETENESS_FOR_RANK = 0.5;

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "outcomes",
    label: "Career Outcomes & Industry Reputation",
    // Absorbs the former standalone "placement" category's weight (0.135):
    // internshipPlacementRate turned out to have near-zero real coverage
    // across the dataset (almost no institution discloses a placement
    // percentage), so it was dropped as a scored metric. The curriculum's
    // required internship hours — a measure of experiential-learning rigor
    // that most schools DO disclose — replaces it here instead.
    weight: 0.405,
    metrics: [
      { path: "outcomes.startingSalary", label: "Starting Salary", weight: 0.35, direction: "higherIsBetter" },
      { path: "outcomes.employmentRate", label: "Employment Rate", weight: 0.25, direction: "higherIsBetter" },
      {
        path: "outcomes.recruiterReputationScore",
        label: "Recruiter Reputation",
        weight: 0.25,
        direction: "higherIsBetter",
      },
      {
        path: "outcomes.requiredInternshipHours",
        label: "Required Internship Hours",
        weight: 0.15,
        direction: "higherIsBetter",
      },
    ],
  },
  {
    key: "academicResearch",
    label: "Academic Research",
    weight: 0.225,
    metrics: [
      {
        path: "academicResearch.facultyPubCitationIndex",
        label: "Faculty Citations",
        weight: 0.65,
        direction: "higherIsBetter",
      },
      {
        path: "academicResearch.researchFundingUSD",
        label: "Research Funding",
        weight: 0.22,
        direction: "higherIsBetter",
      },
      { path: "academicResearch.hasPhDProgram", label: "PhD Program", weight: 0.13, direction: "higherIsBetter" },
    ],
  },
  {
    key: "academicQuality",
    label: "Academic Quality & Completion",
    weight: 0.135,
    metrics: [
      {
        path: "academicQuality.sixYearGraduationRate",
        label: "Graduation Rate",
        weight: 0.25,
        direction: "higherIsBetter",
      },
      { path: "academicQuality.retentionRate", label: "Retention Rate", weight: 0.25, direction: "higherIsBetter" },
      {
        path: "academicQuality.facultyStudentRatio",
        label: "Faculty:Student Ratio",
        weight: 0.25,
        direction: "lowerIsBetter",
      },
      {
        path: "academicQuality.facultyDoctorateRate",
        label: "Faculty Holding a Doctorate",
        weight: 0.25,
        direction: "higherIsBetter",
      },
    ],
  },
  {
    key: "admissions",
    label: "Admissions Selectivity",
    weight: 0.135,
    metrics: [
      { path: "admissions.acceptanceRate", label: "Acceptance Rate", weight: 10 / 20, direction: "lowerIsBetter" },
      {
        path: "admissions.satActEquivalent",
        label: "Selectivity Percentile",
        weight: 10 / 20,
        direction: "higherIsBetter",
      },
    ],
  },
  {
    key: "costOfAttendance",
    label: "Cost of Attendance",
    weight: 0.1,
    metrics: [
      {
        path: "costOfAttendance.totalCost",
        label: "Total Cost of Attendance",
        weight: 1,
        direction: "lowerIsBetter",
      },
    ],
  },
];
