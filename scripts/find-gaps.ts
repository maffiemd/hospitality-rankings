#!/usr/bin/env tsx
/**
 * Scans every program YAML file for missing or low-confidence metrics and
 * reports them. With --write-tasks <dir>, also emits one self-contained
 * task prompt per gap, in the exact-dictation format a 14B-class local
 * model needs (see ~/trial/CLAUDE.md "Model capability limits") — each
 * task names the one field to research, the real YAML shape to match, and
 * the rules to follow. Nothing here contacts a model; it only prepares
 * work a human or Pi run can pick up later.
 *
 * Usage:
 *   npx tsx scripts/find-gaps.ts                      # just report
 *   npx tsx scripts/find-gaps.ts --write-tasks /path   # also write task files
 *   npx tsx scripts/find-gaps.ts --school cornell-sha  # scope to one program
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import { programSchema, type Program, type Metric } from "../src/lib/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRAMS_DIR = join(__dirname, "../src/content/programs");

// Every tracked metric path, with a short label and the project's own unit
// hint — kept in sync by hand with schema.ts; there are few enough fields
// that a generated version isn't worth the indirection yet.
const METRIC_PATHS: Array<{ category: string; field: string; label: string; unit: string }> = [
  { category: "outcomes", field: "startingSalary", label: "Starting Salary", unit: "USD/year" },
  { category: "outcomes", field: "employmentRate", label: "Employment Rate", unit: "%" },
  { category: "outcomes", field: "recruiterReputationScore", label: "Recruiter/Employer Reputation", unit: "0-100" },
  { category: "outcomes", field: "internshipPlacementRate", label: "Internship Placement Rate", unit: "%" },
  { category: "admissions", field: "acceptanceRate", label: "Acceptance Rate", unit: "%" },
  { category: "admissions", field: "satActEquivalent", label: "SAT/ATAR-Equivalent Percentile", unit: "percentile" },
  { category: "academicResearch", field: "facultyPubCitationIndex", label: "Faculty Citation Index", unit: "citations (OpenAlex)" },
  { category: "academicResearch", field: "researchFundingUSD", label: "Research Funding", unit: "USD/year" },
  { category: "academicResearch", field: "hasPhDProgram", label: "Has PhD Program", unit: "boolean (1=yes, 0=no)" },
  { category: "academicQuality", field: "sixYearGraduationRate", label: "6-Yr Graduation Rate", unit: "%" },
  { category: "academicQuality", field: "retentionRate", label: "Retention Rate", unit: "%" },
  { category: "academicQuality", field: "facultyStudentRatio", label: "Faculty:Student Ratio", unit: "students per faculty" },
  { category: "costOfAttendance", field: "totalCost", label: "Total Cost of Attendance", unit: "USD/year" },
];

interface Gap {
  slug: string;
  institution: string;
  name: string;
  website: string;
  category: string;
  field: string;
  label: string;
  unit: string;
  kind: "missing" | "low-confidence";
  currentValue?: number;
  currentNotes?: string;
}

function loadPrograms(): Array<{ file: string; program: Program }> {
  const files = readdirSync(PROGRAMS_DIR).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  return files.map((file) => {
    const raw = loadYaml(readFileSync(join(PROGRAMS_DIR, file), "utf-8"));
    const result = programSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`${file} fails schema validation — fix before scanning for gaps: ${JSON.stringify(result.error.issues)}`);
    }
    return { file, program: result.data };
  });
}

function findGaps(programs: Array<{ file: string; program: Program }>, onlySlug?: string): Gap[] {
  const gaps: Gap[] = [];
  for (const { program } of programs) {
    if (onlySlug && program.slug !== onlySlug) continue;
    for (const { category, field, label, unit } of METRIC_PATHS) {
      const m = (program as unknown as Record<string, Record<string, Metric>>)[category][field];
      const hasValue = m.value !== undefined && m.value !== null;
      if (!hasValue) {
        gaps.push({
          slug: program.slug,
          institution: program.institution,
          name: program.name,
          website: program.website,
          category,
          field,
          label,
          unit,
          kind: "missing",
        });
      } else if (m.confidence === "low") {
        gaps.push({
          slug: program.slug,
          institution: program.institution,
          name: program.name,
          website: program.website,
          category,
          field,
          label,
          unit,
          kind: "low-confidence",
          currentValue: m.value,
          currentNotes: m.notes,
        });
      }
    }
  }
  return gaps;
}

function taskPrompt(gap: Gap): string {
  const path = `${gap.category}.${gap.field}`;
  const askLine =
    gap.kind === "missing"
      ? `This field is currently unsourced. Find a real, citable figure and add it.`
      : `This field has a value (${gap.currentValue}) but low confidence${gap.currentNotes ? ` — existing note: "${gap.currentNotes}"` : ""}. Find a better-sourced figure if one exists; if not, leave it unchanged.`;

  return `You are working in the repository at ~/trial/hospitality-rankings.

Task: research and, if you find a real source, update exactly one field in
exactly one file: \`src/content/programs/${gap.slug}.yaml\`, the \`${path}\`
metric (${gap.label}, unit "${gap.unit}") for ${gap.name} at ${gap.institution}
(${gap.website}).

${askLine}

Where to look: the program's own official pages first (career services,
admissions, institutional research/fact-book), then the sources already
cited elsewhere in this file for the same institution (same publisher is
often reusable, e.g. a Common Data Set or College Navigator page already
linked for another metric in this file).

If you find a real figure, update ONLY the \`${path}\` block to this exact
shape (follow the style of every other metric already in this file):

  ${gap.field}:
    value: <number>
    unit: "${gap.unit}"
    source:
      label: "<short descriptive title of the source page>"
      url: <the exact URL you read the figure from>
      publisher: <who publishes that page>
      asOfDate: "<ISO date the source data reflects, e.g. 2025-01-01>"
    lastVerified: "<today's date, ISO>"
    confidence: <high|medium|low, your honest judgment>
    notes: <what the number measures, any caveat — proxy, small sample, different definition than other schools, etc.>

Rules:
  - Edit only ${gap.slug}.yaml, and only the ${path} block.
  - Do not change or remove any other field or any other program's file.
  - Never fabricate, estimate, or round a "plausible" number. If you cannot
    find a real source with an exact figure, make NO edit and stop.
  - Cite the exact URL you actually read the number from — not a guess at
    where it might be.
  - You cannot run commands. Make the edit (or decide not to) and then
    stop. A reviewer will run the build and tests.
`;
}

function checkScript(gap: Gap): string {
  const path = `${gap.category}.${gap.field}`;
  return `#!/bin/zsh
# Verifies Pi's work on the ${gap.slug} / ${path} gap-fill task.
cd ~/trial/hospitality-rankings || exit 1

echo "== files changed"
git status --short
changed=$(git status --short | awk '{print $2}')
if [ -z "$changed" ]; then
  echo "No changes — Pi made no edit (acceptable outcome if no real source was found)."
  exit 0
fi
if [ "$changed" != "src/content/programs/${gap.slug}.yaml" ]; then
  echo "FAIL: expected only src/content/programs/${gap.slug}.yaml to change"
  exit 1
fi

echo "== diff"
git diff

echo "== schema + build + tests"
npm run build:rankings 2>&1 | tail -5
npm test 2>&1 | tail -10

echo "== reminder for the human reviewer =="
echo "Confirm: the ${path} block has value/unit/source.url/source.label/confidence/notes,"
echo "the source.url is a real, fetchable page, and the figure on that page actually"
echo "matches what was entered. A passing build/test does not verify the citation."
`;
}

function main() {
  const args = process.argv.slice(2);
  const writeIdx = args.indexOf("--write-tasks");
  const writeDir = writeIdx >= 0 ? args[writeIdx + 1] : undefined;
  const schoolIdx = args.indexOf("--school");
  const onlySlug = schoolIdx >= 0 ? args[schoolIdx + 1] : undefined;

  const programs = loadPrograms();
  const gaps = findGaps(programs, onlySlug);

  console.log(`${gaps.length} gap(s) found across ${onlySlug ? 1 : programs.length} program(s):\n`);
  const bySlug = new Map<string, Gap[]>();
  for (const g of gaps) {
    if (!bySlug.has(g.slug)) bySlug.set(g.slug, []);
    bySlug.get(g.slug)!.push(g);
  }
  for (const [slug, slugGaps] of bySlug) {
    console.log(`${slug} (${slugGaps[0].institution}):`);
    for (const g of slugGaps) {
      const tag = g.kind === "missing" ? "MISSING" : `LOW-CONFIDENCE (currently ${g.currentValue})`;
      console.log(`  ${g.category}.${g.field} — ${tag}`);
    }
  }

  if (writeDir) {
    mkdirSync(writeDir, { recursive: true });
    let n = 0;
    for (const g of gaps) {
      n += 1;
      const base = `GAP-${String(n).padStart(3, "0")}-${g.slug}-${g.field}`;
      writeFileSync(join(writeDir, `${base}.md`), taskPrompt(g));
      writeFileSync(join(writeDir, `check-${base}.sh`), checkScript(g));
    }
    console.log(`\nWrote ${n} task + check-script pairs to ${writeDir}`);
  }
}

main();
