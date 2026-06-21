import { z } from "zod";

export { z };

export const entityId = z.string().trim().min(1).max(100);
export const requiredText = (max = 200) => z.string().trim().min(1).max(max);
export const optionalText = (max = 1000) => z.string().trim().max(max).optional().default("");
export const nonNegativeInteger = z.coerce.number().int().min(0).max(1_000_000_000);
export const positiveInteger = z.coerce.number().int().positive().max(1_000_000_000);
export const percentage = z.coerce.number().int().min(0).max(100);
export const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const rupiahInput = z.string().trim().regex(/^[\d.,\s]*$/).max(30);

export function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
