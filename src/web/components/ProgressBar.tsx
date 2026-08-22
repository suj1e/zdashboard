import { cn } from "@/web/lib/utils"

interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("rounded-[var(--radius-full)] bg-muted overflow-hidden", className)} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuetext={`${clamped}%`}>
      <div className="h-full rounded-[var(--radius-full)] bg-primary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  )
}
