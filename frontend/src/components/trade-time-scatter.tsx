import { useMemo, useState, useRef } from "react"
import { scaleLinear, scaleBand, scaleSqrt } from "d3-scale"
import type { TradePoint } from "@/hooks/use-execution-times"

type TimeView = "W" | "M" | "Y"

interface TradeTimeScatterProps {
  trades: TradePoint[]
}

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const MONTH_LABELS = Array.from({ length: 31 }, (_, i) => String(i + 1))
const YEAR_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const BIN_MINUTES = 5
const MIN_HOUR = 8
const MAX_HOUR = 17
const Y_MIN = MIN_HOUR * 60
const Y_MAX = MAX_HOUR * 60

const MARGIN = { top: 20, right: 20, bottom: 32, left: 52 }
const WIDTH = 720
const HEIGHT = 400
const INNER_W = WIDTH - MARGIN.left - MARGIN.right
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom

const MIN_R = 3
const MAX_R = 14

function getXLabels(view: TimeView) {
  if (view === "W") return WEEK_LABELS
  if (view === "M") return MONTH_LABELS
  return YEAR_LABELS
}

function getCategory(date: Date, view: TimeView): string | null {
  const day = date.getDay() // 0=Sun
  if (view === "W") {
    if (day === 0 || day === 6) return null
    return WEEK_LABELS[day - 1]
  }
  if (view === "M") return String(date.getDate())
  return YEAR_LABELS[date.getMonth()]
}

function binTime(date: Date): number | null {
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes < Y_MIN || minutes >= Y_MAX) return null
  return Math.floor(minutes / BIN_MINUTES) * BIN_MINUTES
}

interface DataPoint {
  category: string
  timeBin: number
  tradeType: "buy" | "sell"
  totalAmount: number
  count: number
}

interface PositionedPoint extends DataPoint {
  xOffset: number
}

function computeData(trades: TradePoint[], view: TimeView): DataPoint[] {
  const map = new Map<string, { totalAmount: number; count: number }>()
  for (const t of trades) {
    const cat = getCategory(t.time, view)
    if (cat === null) continue
    const bin = binTime(t.time)
    if (bin === null) continue
    const key = `${cat}|${bin}|${t.tradeType}`
    const existing = map.get(key) ?? { totalAmount: 0, count: 0 }
    existing.totalAmount += t.amount
    existing.count += 1
    map.set(key, existing)
  }
  const points: DataPoint[] = []
  for (const [key, val] of map) {
    const [category, binStr, tradeType] = key.split("|")
    points.push({
      category,
      timeBin: Number(binStr),
      tradeType: tradeType as "buy" | "sell",
      totalAmount: val.totalAmount,
      count: val.count,
    })
  }
  return points
}

/** Dodge overlapping dots within each column by spreading them horizontally */
function dodgePoints(
  points: DataPoint[],
  yScale: (v: number) => number,
  rScale: (v: number) => number,
  bandwidth: number,
): PositionedPoint[] {
  const byCategory = new Map<string, DataPoint[]>()
  for (const p of points) {
    const list = byCategory.get(p.category) ?? []
    list.push(p)
    byCategory.set(p.category, list)
  }

  const result: PositionedPoint[] = []
  for (const [, group] of byCategory) {
    // Sort by time then by type (buy before sell) so dodge is consistent
    const sorted = [...group].sort((a, b) => {
      if (a.timeBin !== b.timeBin) return a.timeBin - b.timeBin
      return a.tradeType === "buy" ? -1 : 1
    })
    const placed: { y: number; r: number; xOffset: number }[] = []

    for (const p of sorted) {
      const y = yScale(p.timeBin)
      const r = rScale(p.totalAmount)
      let xOffset = 0

      // Check for overlap with already-placed dots in this column
      for (const prev of placed) {
        const dy = Math.abs(y - prev.y)
        const minDist = r + prev.r + 2 // 2px gap
        if (dy < minDist) {
          const needed = Math.sqrt(Math.max(0, minDist * minDist - dy * dy))
          if (Math.abs(xOffset) <= needed) {
            xOffset = prev.xOffset <= 0 ? needed : -needed
          }
        }
      }

      // Clamp within band
      const maxOffset = bandwidth / 2 - r
      xOffset = Math.max(-maxOffset, Math.min(maxOffset, xOffset))

      placed.push({ y, r, xOffset })
      result.push({ ...p, xOffset })
    }
  }
  return result
}

function formatTimeBin(bin: number): string {
  const h = Math.floor(bin / 60)
  const m = bin % 60
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

function formatAmount(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`
  return `₹${amount.toFixed(0)}`
}

export function TradeTimeScatter({ trades }: TradeTimeScatterProps) {
  const [view, setView] = useState<TimeView>("W")
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    text: string
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const data = useMemo(() => computeData(trades, view), [trades, view])
  const maxAmount = useMemo(() => Math.max(1, ...data.map((d) => d.totalAmount)), [data])

  const labels = getXLabels(view)

  const xScale = useMemo(
    () => scaleBand<string>().domain(labels).range([0, INNER_W]).padding(0.1),
    [labels],
  )
  const yScale = useMemo(
    () => scaleLinear().domain([Y_MIN, Y_MAX]).range([0, INNER_H]),
    [],
  )
  const rScale = useMemo(
    () => scaleSqrt().domain([1, maxAmount]).range([MIN_R, MAX_R]),
    [maxAmount],
  )

  const positioned = useMemo(
    () => dodgePoints(data, (v) => yScale(v) ?? 0, (v) => rScale(v) ?? 0, xScale.bandwidth()),
    [data, yScale, rScale, xScale],
  )

  const hourTicks = useMemo(() => {
    const ticks: number[] = []
    for (let h = MIN_HOUR; h <= MAX_HOUR; h++) ticks.push(h * 60)
    return ticks
  }, [])

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-1 text-sm">
        {(["W", "M", "Y"] as TimeView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2 py-0.5 font-mono transition-colors duration-150 ${
              view === v
                ? "bg-foreground text-background"
                : "hover:bg-foreground hover:text-background"
            }`}
          >
            [ {v} ]
          </button>
        ))}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full max-w-[720px]"
          aria-label="Trade execution time scatter chart"
        >
          <defs>
            <filter id="glow-buy" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-sell" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
            {/* Grid lines */}
            {hourTicks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={INNER_W}
                y1={yScale(tick)}
                y2={yScale(tick)}
                className="stroke-foreground/10"
                strokeDasharray="4 4"
              />
            ))}

            {/* Y axis labels */}
            {hourTicks.map((tick) => {
              const h = tick / 60
              const period = h >= 12 ? "PM" : "AM"
              const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
              return (
                <text
                  key={tick}
                  x={-8}
                  y={yScale(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] font-mono"
                >
                  {h12}{period}
                </text>
              )
            })}

            {/* X axis labels */}
            {labels.map((label) => (
              <text
                key={label}
                x={(xScale(label) ?? 0) + xScale.bandwidth() / 2}
                y={INNER_H + 20}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-mono"
              >
                {label}
              </text>
            ))}

            {/* Trade dots */}
            {positioned.map((d) => {
              const cx = (xScale(d.category) ?? 0) + xScale.bandwidth() / 2 + d.xOffset
              const cy = yScale(d.timeBin)
              const r = rScale(d.totalAmount)
              const intensity = d.totalAmount / maxAmount

              const isBuy = d.tradeType === "buy"
              // --gain: hsl(152, 60%, 36%) light / hsl(152, 55%, 50%) dark
              // --loss: hsl(347, 77%, 50%) light / hsl(347, 70%, 58%) dark
              const fill = isBuy
                ? isDark
                  ? `hsl(152, 55%, ${40 + intensity * 25}%)`
                  : `hsl(152, 60%, ${28 + (1 - intensity) * 20}%)`
                : isDark
                  ? `hsl(347, 70%, ${45 + intensity * 25}%)`
                  : `hsl(347, 77%, ${35 + (1 - intensity) * 20}%)`
              const opacity = 0.5 + intensity * 0.5

              return (
                <circle
                  key={`${d.category}-${d.timeBin}-${d.tradeType}`}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  opacity={opacity}
                  filter={isBuy ? "url(#glow-buy)" : "url(#glow-sell)"}
                  className="transition-all duration-150"
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return
                    const endBin = d.timeBin + BIN_MINUTES
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      text: `${d.category} ${formatTimeBin(d.timeBin)}–${formatTimeBin(endBin)} · ${d.count} ${d.tradeType}${d.count > 1 ? "s" : ""} · ${formatAmount(d.totalAmount)}`,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 border border-foreground bg-foreground px-2 py-1 text-xs text-background shadow-md"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {trades.length === 0 && (
        <p className="text-sm text-muted-foreground">No timing data available.</p>
      )}
    </div>
  )
}
