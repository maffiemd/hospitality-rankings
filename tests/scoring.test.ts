import { describe, expect, it } from "vitest";
import { scorePrograms } from "../src/lib/scoring.js";
import type { Program } from "../src/lib/schema.js";

function makeMetric(value: number | undefined, unit = "unit") {
  return { value, unit, confidence: "medium" as const };
}

function makeProgram(overrides: {
  slug: string;
  startingSalary?: number;
  employmentRate?: number;
  recruiterReputationScore?: number;
  internshipPlacementRate?: number;
  acceptanceRate?: number;
  satActEquivalent?: number;
  facultyPubCitationIndex?: number;
  researchFundingUSD?: number;
  facultyStudentRatio?: number;
  hasPhDProgram?: number;
}): Program {
  return {
    slug: overrides.slug,
    name: overrides.slug,
    institution: overrides.slug,
    country: "US",
    region: "US",
    website: "https://example.com",
    degreeName: "BS Hospitality",
    outcomes: {
      startingSalary: makeMetric(overrides.startingSalary, "USD/year"),
      employmentRate: makeMetric(overrides.employmentRate, "%"),
      recruiterReputationScore: makeMetric(overrides.recruiterReputationScore, "0-100"),
      internshipPlacementRate: makeMetric(overrides.internshipPlacementRate, "%"),
    },
    admissions: {
      acceptanceRate: makeMetric(overrides.acceptanceRate, "%"),
      satActEquivalent: makeMetric(overrides.satActEquivalent, "score"),
    },
    academicResearch: {
      facultyPubCitationIndex: makeMetric(overrides.facultyPubCitationIndex, "index"),
      researchFundingUSD: makeMetric(overrides.researchFundingUSD, "USD/year"),
      facultyStudentRatio: makeMetric(overrides.facultyStudentRatio, "ratio"),
      hasPhDProgram: makeMetric(overrides.hasPhDProgram, "bool"),
    },
  };
}

describe("scorePrograms", () => {
  it("handles a single-program dataset without dividing by zero", () => {
    const programs = [makeProgram({ slug: "solo", startingSalary: 50000, employmentRate: 90 })];
    const { rankings } = scorePrograms(programs);
    expect(rankings).toHaveLength(1);
    expect(rankings[0].rank).toBe(1);
    expect(Number.isNaN(rankings[0].compositeScore)).toBe(false);
  });

  it("scores an all-equal metric as a neutral 100 rather than dividing by zero", () => {
    const programs = [
      makeProgram({ slug: "a", startingSalary: 50000 }),
      makeProgram({ slug: "b", startingSalary: 50000 }),
    ];
    const { rankings } = scorePrograms(programs);
    const salaryMetric = rankings[0].categories[0].metrics.find((m) => m.path === "outcomes.startingSalary");
    expect(salaryMetric?.normalized).toBe(100);
  });

  it("re-weights within a category when a metric is missing, instead of penalizing to zero", () => {
    const programs = [
      makeProgram({ slug: "complete", startingSalary: 60000, employmentRate: 95, recruiterReputationScore: 80 }),
      makeProgram({ slug: "missing-recruiter", startingSalary: 60000, employmentRate: 95 }),
    ];
    const { rankings } = scorePrograms(programs);
    const complete = rankings.find((r) => r.program.slug === "complete")!;
    const missing = rankings.find((r) => r.program.slug === "missing-recruiter")!;
    // Both have identical salary/employment, so re-weighting the remaining
    // metrics should put them at the same outcomes score, not penalize the
    // one missing recruiterReputationScore down to a lower score.
    expect(missing.categories[0].score).toBeCloseTo(complete.categories[0].score ?? NaN, 5);
  });

  it("inverts direction for lower-is-better metrics (acceptance rate)", () => {
    const programs = [
      makeProgram({ slug: "selective", acceptanceRate: 10 }),
      makeProgram({ slug: "open", acceptanceRate: 90 }),
    ];
    const { rankings } = scorePrograms(programs);
    const selective = rankings.find((r) => r.program.slug === "selective")!;
    const open = rankings.find((r) => r.program.slug === "open")!;
    const selectiveAcceptance = selective.categories
      .find((c) => c.key === "admissions")!
      .metrics.find((m) => m.path === "admissions.acceptanceRate")!;
    const openAcceptance = open.categories
      .find((c) => c.key === "admissions")!
      .metrics.find((m) => m.path === "admissions.acceptanceRate")!;
    expect(selectiveAcceptance.normalized).toBeGreaterThan(openAcceptance.normalized ?? -Infinity);
  });

  it("assigns the same rank to tied composite scores", () => {
    const programs = [
      makeProgram({ slug: "a", startingSalary: 50000 }),
      makeProgram({ slug: "b", startingSalary: 50000 }),
      makeProgram({ slug: "c", startingSalary: 70000 }),
    ];
    const { rankings } = scorePrograms(programs);
    const a = rankings.find((r) => r.program.slug === "a")!;
    const b = rankings.find((r) => r.program.slug === "b")!;
    const c = rankings.find((r) => r.program.slug === "c")!;
    expect(a.rank).toBe(b.rank);
    expect(c.rank).toBe(1);
    expect(a.rank).toBe(2);
  });

  it("marks programs with no usable metrics as unranked (null) rather than crashing", () => {
    const programs = [makeProgram({ slug: "empty" }), makeProgram({ slug: "full", startingSalary: 50000 })];
    const { rankings } = scorePrograms(programs);
    const empty = rankings.find((r) => r.program.slug === "empty")!;
    expect(empty.compositeScore).toBeNull();
    expect(empty.rank).toBeNull();
  });
});
