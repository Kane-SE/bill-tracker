import { z } from 'zod'
import { nightSchema } from '@/apps/split/types'
import { useSplitStore } from '@/apps/split/store/useSplitStore'
import { getStoredTheme, applyTheme } from '@/shared/lib/theme'

/**
 * App-aware backup (shell concern): serializes/deserializes the whole app's
 * data — currently just the `split` app plus the shared appearance/theme
 * choice — as a single JSON file. Still imports v1 files (pre-launcher, no
 * `apps`/`appearance` wrapper) by migrating them into the v2 shape.
 */

const customColorsSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  primary: z.string(),
  accent: z.string(),
  destructive: z.string(),
  success: z.string(),
})

const splitDataSchema = z.object({
  knownNames: z.array(z.string()),
  nights: z.array(nightSchema),
  promotedNames: z.array(z.string()).default([]),
})

const appearanceSchema = z.object({
  palette: z.enum(['default', 'coffee', 'custom']),
  mode: z.enum(['light', 'dark']),
  custom: customColorsSchema.optional(),
})

const backupV2Schema = z.object({
  version: z.literal(2),
  apps: z.object({ split: splitDataSchema }),
  appearance: appearanceSchema.optional(),
})
export type BackupV2 = z.infer<typeof backupV2Schema>

const backupV1Schema = z.object({
  version: z.literal(1),
  knownNames: z.array(z.string()),
  nights: z.array(nightSchema),
})

export function buildBackup(): BackupV2 {
  const { knownNames, nights, promotedNames } = useSplitStore.getState()
  const { palette, mode, custom } = getStoredTheme()
  return {
    version: 2,
    apps: { split: { knownNames, nights, promotedNames } },
    appearance: { palette, mode, custom },
  }
}

export function applyBackup(b: BackupV2): void {
  useSplitStore.setState({
    knownNames: b.apps.split.knownNames,
    nights: b.apps.split.nights,
    promotedNames: b.apps.split.promotedNames,
  })
  if (b.appearance) applyTheme(b.appearance)
}

export type ParseResult = { ok: true; data: BackupV2 } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  const v2 = backupV2Schema.safeParse(json)
  if (v2.success) return { ok: true, data: v2.data }

  const v1 = backupV1Schema.safeParse(json)
  if (v1.success) {
    return {
      ok: true,
      data: {
        version: 2,
        apps: {
          split: { knownNames: v1.data.knownNames, nights: v1.data.nights, promotedNames: [] },
        },
      },
    }
  }

  return { ok: false, error: 'This file is not a valid Split backup.' }
}
