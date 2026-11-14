import { z } from "zod";

const optionsSchema = z
  .object({
    size: z.number().int().min(1, "size must be greater than 0"),
    overlap: z.number().int().min(0, "overlap must not be negative"),
  })
  .superRefine((data, ctx) => {
    if (data.overlap >= data.size) {
      ctx.addIssue({
        code: "custom",
        path: ["overlap"],
        message: "overlap must be smaller than size",
      });
    }
  });

export type ChunkOptions = z.infer<typeof optionsSchema>;

export const chunkText = (text: string, options: ChunkOptions): string[] => {
  const { size, overlap } = optionsSchema.parse(options);

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) {
      break;
    }
    start += size - overlap;
  }
  return chunks;
};
