#!/usr/bin/env tsx
/**
 * Standalone, re-runnable pipeline: reads every program YAML file directly
 * (independent of the Astro build), validates it against the shared Zod
 * schema, computes composite scores/ranks, and writes the single JSON file
 * the Astro site reads. Run via `npm run build:rankings`.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import { programSchema } from "../src/lib/schema.js";
import { scorePrograms } from "../src/lib/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRAMS_DIR = join(__dirname, "../src/content/programs");
const OUTPUT_PATH = join(__dirname, "../data/generated/rankings.json");

function loadPrograms() {
  const files = readdirSync(PROGRAMS_DIR).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  if (files.length === 0) {
    throw new Error(`No program YAML files found in ${PROGRAMS_DIR}`);
  }

  const programs = files.map((file) => {
    const raw = loadYaml(readFileSync(join(PROGRAMS_DIR, file), "utf-8"));
    const result = programSchema.safeParse(raw);
    if (!result.success) {
      console.error(`Validation failed for ${file}:`);
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
      }
      throw new Error(`Invalid program data in ${file}`);
    }
    return result.data;
  });

  const slugs = new Set<string>();
  for (const p of programs) {
    if (slugs.has(p.slug)) throw new Error(`Duplicate program slug: ${p.slug}`);
    slugs.add(p.slug);
  }

  return programs;
}

function main() {
  const programs = loadPrograms();
  const result = scorePrograms(programs);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  console.log(`Scored ${result.programCount} programs -> ${OUTPUT_PATH}`);
  for (const r of [...result.rankings].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))) {
    const score = r.compositeScore !== null ? r.compositeScore.toFixed(1) : "—";
    console.log(`  #${r.rank ?? "—"}  ${r.program.name} (${r.program.institution})  score=${score}  completeness=${(r.dataCompleteness * 100).toFixed(0)}%`);
  }
}

main();
