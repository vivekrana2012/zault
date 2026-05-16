import { useState } from "react"
import type { HoldingWithPercentage } from "@/hooks/use-holdings"
import type { CurrencySymbol } from "@/types/holdings"
import { CategorySelect } from "@/components/category-select"
import { BracketButton } from "@/components/bracket-button"
import { Input } from "@/components/ui/input"
import { roundAmount, amountFormat } from "@/lib/currency"

const AMOUNT_INPUT_CLASS = "w-28 text-right ml-auto border-b border-foreground/30 focus-visible:border-b-2 focus-visible:border-foreground/60"

interface HoldingsTableProps {
  holdings: HoldingWithPercentage[]
  currency: CurrencySymbol
  usedCategories: Set<string>
  onAdd: (category: string, amount: number) => void
  onUpdate: (id: number, updates: Partial<{ category: string; amount: number }>) => void
  onDelete: (id: number) => void
}

export function HoldingsTable({
  holdings,
  currency,
  usedCategories,
  onAdd,
  onUpdate,
  onDelete,
}: HoldingsTableProps) {
  const [newCategory, setNewCategory] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState("")

  const handleAdd = () => {
    const amount = roundAmount(parseFloat(newAmount))
    if (!newCategory.trim() || isNaN(amount) || amount <= 0) return
    if (usedCategories.has(newCategory.trim())) return
    onAdd(newCategory.trim(), amount)
    setNewCategory("")
    setNewAmount("")
  }

  const handleEditStart = (holding: HoldingWithPercentage) => {
    setEditingId(holding.id)
    setEditAmount(holding.amount.toString())
  }

  const handleEditSave = (id: number) => {
    const amount = roundAmount(parseFloat(editAmount))
    if (!isNaN(amount) && amount > 0) {
      onUpdate(id, { amount })
    }
    setEditingId(null)
    setEditAmount("")
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditAmount("")
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2">
            <th className="py-2 pr-4 text-center font-semibold">Category</th>
            <th className="py-2 pr-4 text-right font-semibold">Amount</th>
            <th className="py-2 pr-4 text-center font-semibold">%</th>
            <th className="py-2 text-center font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.id} className="border-b border-foreground/10">
              <td className="py-2 pr-4 text-center">{h.category}</td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {editingId === h.id ? (
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(h.id)
                      if (e.key === "Escape") handleEditCancel()
                    }}
                    className={AMOUNT_INPUT_CLASS}
                    autoFocus
                    min="0"
                    step="any"
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:border-b hover:border-dashed"
                    onClick={() => handleEditStart(h)}
                    title="Click to edit"
                  >
                    {currency}{h.amount.toLocaleString(undefined, amountFormat)}
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-center tabular-nums text-muted-foreground">
                {h.percentage.toFixed(1)}%
              </td>
              <td className="py-2 text-center">
                {editingId === h.id ? (
                  <span className="flex items-center justify-center gap-1">
                    <BracketButton label="Save" size="sm" variant="ghost" onClick={() => handleEditSave(h.id)} />
                    <BracketButton label="×" size="sm" variant="ghost" onClick={handleEditCancel} />
                  </span>
                ) : (
                  <BracketButton label="×" size="sm" variant="ghost" onClick={() => onDelete(h.id)} aria-label={`Delete ${h.category}`} />
                )}
              </td>
            </tr>
          ))}
          {/* Add row */}
          <tr className="border-b border-foreground/10">
            <td className="py-2 pr-4 text-center">
              <CategorySelect
                value={newCategory}
                onChange={setNewCategory}
                usedCategories={usedCategories}
                placeholder="category"
              />
            </td>
            <td className="py-2 pr-4 text-right">
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                }}
                placeholder="amount"
                className={AMOUNT_INPUT_CLASS}
                min="0"
                step="any"
              />
            </td>
            <td className="py-2 pr-4 text-center text-muted-foreground">—</td>
            <td className="py-2 text-center">
              <BracketButton label="Add" size="sm" onClick={handleAdd} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
