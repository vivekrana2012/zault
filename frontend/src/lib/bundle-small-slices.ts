import type { HoldingWithPercentage } from "@/hooks/use-holdings"

const MAX_SLICES = 10
const THRESHOLD = 2.5 // slices below this % get bundled into "Others"

/**
 * Keeps up to MAX_SLICES items in the donut chart.
 * Items beyond the limit OR below THRESHOLD are bundled into "Others".
 * Data must already be sorted descending by amount (tradesToDonut does this).
 */
export function bundleSmallSlices(data: HoldingWithPercentage[]): HoldingWithPercentage[] {
  if (data.length <= MAX_SLICES && data.every((d) => d.percentage >= THRESHOLD)) {
    return data
  }

  const major: HoldingWithPercentage[] = []
  let othersAmount = 0
  let othersPercentage = 0

  for (let i = 0; i < data.length; i++) {
    if (i < MAX_SLICES && data[i].percentage >= THRESHOLD) {
      major.push(data[i])
    } else {
      othersAmount += data[i].amount
      othersPercentage += data[i].percentage
    }
  }

  if (othersAmount > 0) {
    major.push({
      id: -1,
      category: "Others",
      amount: othersAmount,
      percentage: othersPercentage,
    })
  }

  return major
}
