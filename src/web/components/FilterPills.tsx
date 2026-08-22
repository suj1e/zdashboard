import * as React from "react"
import { cn } from "@/web/lib/utils"

export interface FilterItem {
  key: string
  label: string
  badge?: React.ReactNode
  className?: string
  renderLabel?: (item: FilterItem) => React.ReactNode
  renderExtra?: (item: FilterItem) => React.ReactNode
}

export interface FilterPillsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: FilterItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  renderExtra?: (item: FilterItem) => React.ReactNode
  renderLabel?: (item: FilterItem) => React.ReactNode
}

export function FilterPills({ items, value, onChange, ariaLabel, renderExtra, renderLabel, className, ...props }: FilterPillsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("inline-flex items-center gap-1.5 flex-wrap", className)} {...props}>
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-full)] border text-xs transition-colors",
              active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
              item.className
            )}
          >
            {item.renderLabel ? item.renderLabel(item) : renderLabel ? renderLabel(item) : <span>{item.label}</span>}
            {item.badge && <span className="opacity-80">{item.badge}</span>}
            {item.renderExtra ? item.renderExtra(item) : renderExtra?.(item)}
          </button>
        )
      })}
    </div>
  )
}
