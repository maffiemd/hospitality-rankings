# Global Hospitality Program Rankings

A source-cited composite ranking of global undergraduate hospitality & hotel administration
programs, combining career-outcome metrics (starting salary, employment rate, recruiter
reputation), academic-research metrics (faculty citations, faculty-student ratio, research
funding, PhD programs), admissions selectivity (acceptance rate, SAT/ACT equivalent), and
internship/placement pipeline strength. Every number behind every score is individually sourced
and dated — see [`/methodology`](src/pages/methodology.astro) for the weighting and
[`/sources`](src/pages/sources.astro) for the full bibliography.

## How it works

1. Each program's raw data lives in one YAML file in [`src/content/programs/`](src/content/programs/),
   validated against the shared Zod schema in [`src/lib/schema.ts`](src/lib/schema.ts). Every metric
   is an object carrying `value`, `unit`, `source` (label/url/publisher/asOfDate), `lastVerified`,
   `confidence`, and optional `notes` — never a bare number.
2. [`scripts/build-rankings.ts`](scripts/build-rankings.ts) is a standalone pipeline script: it loads
   every program file, validates it, normalizes each metric to 0-100 across the active program set,
   applies the weights in [`src/config/weights.ts`](src/config/weights.ts), computes a composite
   score and rank, and writes [`data/generated/rankings.json`](data/generated/rankings.json).
3. The Astro site (`src/pages/`) only reads that generated JSON — it never talks to the YAML files
   directly. This keeps the pipeline reusable independent of the site (e.g. for a future CSV export)
   and means the site always reflects exactly what the pipeline computed.

## Commands

| Command                   | Action                                                        |
| :------------------------ | :------------------------------------------------------------ |
| `npm install`              | Install dependencies                                          |
| `npm run build:rankings`   | Re-run the scoring pipeline (reads YAML → writes rankings.json) |
| `npm test`                 | Run the scoring-pipeline unit tests (vitest)                  |
| `npm run dev`               | Rebuild rankings, then start the dev server at `localhost:4321` |
| `npm run build`             | Rebuild rankings, then build the static site to `./dist/`      |
| `npm run preview`           | Preview the production build locally                          |

## Adding or editing a program

1. Add or edit a YAML file in `src/content/programs/` (copy an existing one as a template — every
   metric needs a `unit`; `value`/`source` can be omitted if not yet sourced, but leave a `notes`
   field explaining the gap rather than estimating a number).
2. Run `npm run build:rankings` to regenerate the ranking deterministically.
3. Run `npm run dev` to preview the change.

## Status

**v1 seed data**: 3 of the ~20 planned undergraduate programs (Cornell, Penn State, UNLV) are
populated with real, cited figures where a public source was found for v1; several metrics per
program are intentionally left unsourced (flagged in each profile's "data completeness") rather
than estimated. Remaining programs and metrics — including all research-output figures, which are
planned to come from the OpenAlex API — are still to be added.

## Deploying

[`​.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys to GitHub Pages
on every push to `main`. Before the first deploy: enable GitHub Pages → Source → GitHub Actions in
the repo settings, and set `site` (and `base`, if hosted under a repo subpath rather than a custom
domain or an `<org>.github.io` root repo) in `astro.config.mjs` — the site currently uses
root-relative links (`/`, `/methodology/`, …), which assumes it's served from the domain root.
