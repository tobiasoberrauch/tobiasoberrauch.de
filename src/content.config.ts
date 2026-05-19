import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const hochbegabung = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/hochbegabung' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    description: z.string(),
    order: z.number().optional(),
    heroImage: z.string().optional(),
  }),
});

export const collections = { hochbegabung };
