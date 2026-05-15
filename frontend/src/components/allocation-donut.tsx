import { useState, useRef } from "react"
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
  if (amount >= 10_000_000) return `${currency}${(amount / 10_000_000).toFixed(1)}Cr`
  if (amount >= 100_000) return `${currency}${(amount / 100_000).toFixed(1)}L`
  if (amount >= 1_000) return `${currency}${(amount / 1_000).toFixed(1)}K`
  return `${currency}${amount.toLocaleString()}`
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export function AllocationDonut({ holdings, total, currency }: AllocationDonutProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const size = 400
  const cx = size / 2
  const cy = size / 2
  const outerR = 170
  const strokeWidth = 55
  const hoverStrokeWidth = strokeWidth * 1.15
  const r = outerR - strokeWidth / 2

  // Detect dark mode via CSS custom property
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  const fills = isDark ? DARK_SLICE_FILLS : SLICE_FILLS

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Empty allocation chart">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            opacity={0.1}
          />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-sm">
            No holdings
          </text>
        </svg>
      </div>
    )
  }

  let currentAngle = 0
  const slices = holdings.map((h, i) => {
    const sliceAngle = (h.percentage / 100) * 360
    // Avoid rendering a zero-width slice
    if (sliceAngle < 0.5) {
      return null
    }
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle
    currentAngle = endAngle

    // For a full circle (single holding), use two semicircles
    if (sliceAngle >= 359.9) {
      const isHovered = hoveredId === h.id
      return (
        <g
          key={h.id}
          onMouseEnter={() => setHoveredId(h.id)}
          onMouseLeave={() => setHoveredId(null)}
          onMouseMove={(e) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          }}
          className="cursor-pointer"
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={fills[i % fills.length]}
            strokeWidth={isHovered ? hoverStrokeWidth : strokeWidth}
            className="transition-all duration-150"
          />
        </g>
      )
    }

    const path = describeArc(cx, cy, r, startAngle, endAngle)
    const isHovered = hoveredId === h.id
    return (
      <g
        key={h.id}
        onMouseEnter={() => setHoveredId(h.id)}
        onMouseLeave={() => setHoveredId(null)}
        onMouseMove={(e) => {
          if (!containerRef.current) return
          const rect = containerRef.current.getBoundingClientRect()
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        className="cursor-pointer"
      >
        <path
          d={path}
          fill="none"
          stroke={fills[i % fills.length]}
          strokeWidth={isHovered ? hoverStrokeWidth : strokeWidth}
          strokeLinecap="butt"
          className="transition-all duration-150"
        />
      </g>
    )
  })

  const hoveredHolding = holdings.find((h) => h.id === hoveredId)

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Portfolio allocation donut chart" role="img">
        {slices}
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">
          {formatAmount(total, currency)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
          Total
        </text>
      </svg>
      {/* Themed tooltip */}
      {hoveredHolding && (
        <div
          className="pointer-events-none absolute z-50 border border-foreground bg-background px-3 py-1.5 text-sm text-foreground shadow-md"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 32 }}
        >
          {hoveredHolding.category}: {currency}{hoveredHolding.amount.toLocaleString()} ({hoveredHolding.percentage.toFixed(1)}%)
        </div>
      )}
      {/* Legend */}
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
