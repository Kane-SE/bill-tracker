import { z } from 'zod'

/**
 * Domain types + zod schemas. The schemas double as validation for imported
 * JSON backups, so the shape lives in exactly one place.
 */

export const shareSchema = z.object({
  name: z.string(),
  amount: z.number().nonnegative(),
})
export type Share = z.infer<typeof shareSchema>

export const itemSchema = z.object({
  id: z.string(),
  label: z.string(),
  payer: z.string(),
  amount: z.number().nonnegative(),
  shares: z.array(shareSchema),
})
export type Item = z.infer<typeof itemSchema>

export const nightStatus = z.enum(['active', 'settled'])
export type NightStatus = z.infer<typeof nightStatus>

export const nightSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  date: z.string(),
  status: nightStatus,
  settledAt: z.string().optional(),
  participants: z.array(z.string()),
  items: z.array(itemSchema),
})
export type Night = z.infer<typeof nightSchema>

/** A netted, directional debt: `from` owes `to` `amount`. */
export interface Debt {
  from: string
  to: string
  amount: number
}
