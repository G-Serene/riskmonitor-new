"use client"
import { BarChart3 } from "lucide-react"

export function DummyBarChart({ title }: { title: string }) {
  return (
    <div className="text-center text-muted-foreground">
      <BarChart3 className="mx-auto h-12 w-12 mb-2" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs">(Bar Chart Placeholder)</p>
    </div>
  )
}
