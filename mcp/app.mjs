import * as z from 'zod/v4';
export const app = "viral-radar";
export const prefix = "buzz";
export const port = 45934;
export const operation = "generate_brief";
export const description = "Retrieve public observations and generate an evidence-linked creative brief using the connected provider. Category defaults to the application’s current category. job_get returns Markdown and planning prompts for Story Maker.";
export const input = z.object({ category: z.string().trim().min(1).max(80).optional() }).strict();
export const output = z.object({ title: z.string().max(1000), reportMarkdown: z.string().min(1).max(250000), planPrompts: z.array(z.object({ id: z.string(), title: z.string(), prompt: z.string() })).max(30) }).strict();
