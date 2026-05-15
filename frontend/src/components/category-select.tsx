import { useState, useRef, useEffect } from "react"
import { PREDEFINED_CATEGORIES } from "@/types/holdings"
import { Input } from "@/components/ui/input"

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  usedCategories: Set<string>
  placeholder?: string
}

export function CategorySelect({ value, onChange, usedCategories, placeholder = "Category" }: CategorySelectProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  const availableCategories = PREDEFINED_CATEGORIES.filter(
    (cat) => !usedCategories.has(cat),
  )

  const filtered = availableCategories.filter((cat) =>
    cat.toLowerCase().includes(inputValue.toLowerCase()),
  )

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // Commit whatever is typed
        if (inputValue.trim() && inputValue !== value) {
          onChange(inputValue.trim())
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [inputValue, value, onChange])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            if (inputValue.trim()) {
              onChange(inputValue.trim())
              setOpen(false)
            }
          }
          if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        className="w-full border-b border-foreground/30 focus-visible:border-b-2 focus-visible:border-foreground/60 text-center"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 z-50 mt-1 w-full border bg-popover text-popover-foreground shadow-md max-h-48 overflow-y-auto">
          {filtered.map((cat) => (
            <li key={cat}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-foreground hover:text-background transition-colors duration-150"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setInputValue(cat)
                  onChange(cat)
                  setOpen(false)
                }}
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
