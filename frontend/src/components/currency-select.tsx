import { useState, useRef, useEffect } from "react"
import { CURRENCY_SYMBOLS, type CurrencySymbol } from "@/types/holdings"

interface CurrencySelectProps {
  value: CurrencySymbol
  onChange: (value: CurrencySymbol) => void
}

export function CurrencySelect({ value, onChange }: CurrencySelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="border-b-2 border-input bg-transparent px-2 py-0.5 text-sm transition-colors duration-150 hover:bg-foreground hover:text-background focus:outline-none"
      >
        {value}
      </button>
      {open && (
        <ul className="absolute top-full left-0 z-50 mt-1 border bg-popover text-popover-foreground shadow-md">
          {CURRENCY_SYMBOLS.map((sym) => (
            <li key={sym}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-center text-sm hover:bg-foreground hover:text-background transition-colors duration-150"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(sym)
                  setOpen(false)
                }}
              >
                {sym}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
