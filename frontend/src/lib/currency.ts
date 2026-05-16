/** Round a number to 4 decimal places. Use for all monetary amounts. */
export function roundAmount(value: number): number {
  return Math.round(value * 10000) / 10000
}

/** Round a quantity to 3 decimal places. */
export function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Round a price to 4 decimal places. Alias for roundAmount — same precision. */
export const roundPrice = roundAmount

/** Format options for displaying amounts: always 4 decimal places. */
export const amountFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
}

/** Format options for displaying quantities: up to 3 decimal places. */
export const quantityFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
}
