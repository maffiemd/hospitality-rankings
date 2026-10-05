import { z } from "zod";

export const confidenceLevel = z.enum(["high", "medium", "low"]);

export const source = z.object({
  label: z.string(),
  url: z.string().url(),
  publisher: z.string(),
  asOfDate: z.string(), // ISO date (YYYY-MM-DD) the source data reflects
});

/** A single sourced data point. `value` is omitted when the metric is unknown for this program. */
export const metric = z.object({
  value: z.number().optional(),
  unit: z.string(),
  source: source.optional(),
  lastVerified: z.string().optional(), // ISO date this value was last checked by a maintainer
  confidence: confidenceLevel.default("medium"),
  notes: z.string().optional(),
});

export const outcomesMetrics = z.object({
  startingSalary: metric, // USD/year
  employmentRate: metric, // %
  recruiterReputationScore: metric, // 0-100, provisional proxy
  internshipPlacementRate: metric, // %
});

export const admissionsMetrics = z.object({
  acceptanceRate: metric, // %
  satActEquivalent: metric, // SAT-equivalent composite score
});

export const academicResearchMetrics = z.object({
  facultyPubCitationIndex: metric, // normalized citation index from OpenAlex
  researchFundingUSD: metric, // USD/year
  facultyStudentRatio: metric, // students per faculty (lower is better)
  hasPhDProgram: metric, // 1 = yes, 0 = no
});

export const programSchema = z.object({
  slug: z.string(),
  name: z.string(),
  institution: z.string(),
  country: z.string(),
  region: z.enum(["US", "Europe", "Asia-Pacific"]),
  website: z.string().url(),
  degreeName: z.string(),
  accreditation: z.string().optional(),
  outcomes: outcomesMetrics,
  admissions: admissionsMetrics,
  academicResearch: academicResearchMetrics,
});

export type Metric = z.infer<typeof metric>;
export type Program = z.infer<typeof programSchema>;
