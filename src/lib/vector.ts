import { z } from "zod";
const vectorSchema = z.object({ vector: z.array(z.number()).nonempty() });

export function toVectorLiteral(vector: number[]): string {
  const { vector: validatedVector } = vectorSchema.parse({ vector });

  return `[${validatedVector.join(",")}]`;
}
