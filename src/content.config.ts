import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { programSchema } from "./lib/schema.js";

const programs = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/programs" }),
  schema: programSchema,
});

export const collections = { programs };
