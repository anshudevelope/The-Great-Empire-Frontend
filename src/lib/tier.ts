/**
 * What each tier is for. Mirrors TIER_LABELS in the API's config/constants.js —
 * keep the two in step.
 */
export const TIER_LABELS: Record<string, string> = {
  'Tier I': 'Insurance',
  'Tier II': 'Plots',
}

/** "Tier I (Insurance)", "Tier II (Plots)" — the one way a tier is shown anywhere. */
export function formatTier(tier: string | null | undefined): string {
  if (!tier) return '—'
  const label = TIER_LABELS[tier]
  return label ? `${tier} (${label})` : tier
}
