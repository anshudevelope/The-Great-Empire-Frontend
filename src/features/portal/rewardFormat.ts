/** Indian short form: ₹2.5 Lakh, ₹1.75 Cr. Used by both reward plans. */
export function inr(value: number): string {
  if (value >= 10_000_000) return `₹${trim(value / 10_000_000)} Cr`
  if (value >= 100_000) return `₹${trim(value / 100_000)} Lakh`
  return `₹${value.toLocaleString('en-IN')}`
}

const trim = (n: number) => String(Number(n.toFixed(2)))
