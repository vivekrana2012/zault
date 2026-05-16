import { useState, useRef, useMemo } from "react"
import { pie, arc } from "d3-shape"
import type { PieArcDatum } from "d3-shape"
import type { HoldingWithPercentage } from "@/hooks/use-holdings"
import type { CurrencySymbol } from "@/types/holdings"

// Soft categorical fills — 10 distinct gentle hues
const SLICE_FILLS = [
  "hsl(220 55% 52%)",
  "hsl(150 45% 45%)",
  "hsl(40 72% 55%)",
  "hsl(350 50% 54%)",
  "hsl(270 40% 54%)",
  "hsl(180 45% 45%)",
  "hsl(55 62% 50%)",
  "hsl(320 38% 52%)",
  "hsl(195 50% 48%)",
  "hsl(100 38% 47%)",
]

const DARK_SLICE_FILLS = [
  "hsl(220 48% 62%)",
  "hsl(150 40% 56%)",
  "hsl(40 62% 60%)",
  "hsl(350 44% 60%)",
  "hsl(270 35% 62%)",
  "hsl(180 40% 56%)",
  "hsl(55 55% 57%)",
  "hsl(320 34% 58%)",
  "hsl(195 44% 58%)",
  "hsl(100 34% 55%)",
]

interface AllocationDonutProps {
  holdings: HoldingWithPercentage[]
  total: number
  currency: CurrencySymbol
}

function formatAmount(amount: number, currency: CurrencySymbol): string {
  if (amount >= 10_000_000) return `${currency}${(amount / 10_000_000).toFixed(2)}Cr`
  if (amount >= 100_000) return `${currency}${(amount / 100_000).toFixed(2)}L`
  if (amount >= 1_000) return `${currency}${(amount / 1_000).toFixed(2)}K`
  return `${currency}${amount.toLocaleString()}`
}

const SIZE = 400
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = 170
const INNER_R = 115
const HOVER_OUTER_R = 174
const HOVER_INNER_R = 111

const pieLayout = pie<HoldingWithPercentage>()
  .value((d) => d.percentage)
  .sort(null)
  .padAngle(0.015)

const normalArc = arc<PieArcDatum<HoldingWithPercentage>>()
  .innerRadius(INNER_R)
  .outerRadius(OUTER_R)
  .cornerRadius(0)

const hoverArc = arc<PieArcDatum<HoldingWithPercentage>>()
  .innerRadius(HOVER_INNER_R)
  .outerRadius(HOVER_OUTER_R)
  .cornerRadius(0)

export function AllocationDonut({ holdings, total, currency }: AllocationDonutProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const fills = isDark ? DARK_SLICE_FILLS : SLICE_FILLS

  const arcs = useMemo(() => pieLayout(holdings), [holdings])

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="Empty allocation chart">
          <circle
            cx={CX}
            cy={CY}
            r={(OUTER_R + INNER_R) / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={OUTER_R - INNER_R}
            opacity={0.1}
          />
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-sm">
            No holdings
          </text>
        </svg>
      </div>
    )
  }

  const hoveredHolding = holdings.find((h) => h.id === hoveredId)

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-4">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="Portfolio allocation donut chart" role="img">
        <g transform={`translate(${CX},${CY})`}>
          {arcs.map((d, i) => {
            const isHovered = hoveredId === d.data.id
            const pathD = (isHovered ? hoverArc : normalArc)(d)
            if (!pathD) return null
            return (
              <path
                key={d.data.id}
                d={pathD}
                fill={fills[i % fills.length]}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredId(d.data.id)}
                onMouseLeave={() => setHoveredId(null)}
                onMouseMove={(e) => {
                  if (!containerRef.current) return
                  const rect = containerRef.current.getBoundingClientRect()
                  setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                }}
              />
            )
          })}
        </g>
        <text x={CX} y={CY - 8} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">
          {formatAmount(total, currency)}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
          Total
        </text>
      </svg>
      {hoveredHolding && (
        <div
          className="pointer-events-none absolute z-50 border border-foreground bg-background px-3 py-1.5 text-sm text-foreground shadow-md"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 32 }}
        >
          {hoveredHolding.category}: {currency}{hoveredHolding.amount.toLocaleString()} ({hoveredHolding.percentage.toFixed(1)}%)
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {holdings.map((h, i) => (
          <div key={h.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-3 w-3 border border-foreground/20"
              style={{ backgroundColor: fills[i % fills.length] }}
            />
            <span>{h.category}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
