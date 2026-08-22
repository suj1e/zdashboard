import { cn } from "@/web/lib/utils"

interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("rounded-full bg-muted overflow-hidden", className)} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuetext={`${clamped}%`}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  )
}
