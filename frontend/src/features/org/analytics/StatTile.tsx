import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </CardContent>
    </Card>
  );
}

/** A thin horizontal meter: value / max */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
      className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-viz-series" style={{ width: `${pct}%` }} />
    </div>
  );
}
