import type { Metric, Program } from "./schema.js";

/** Looks up a metric object (value/unit/source/confidence/notes) by its dot-path, e.g. "outcomes.startingSalary". */
export function getMetric(program: Program, path: string): Metric | undefined {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, program) as Metric | undefined;
}
