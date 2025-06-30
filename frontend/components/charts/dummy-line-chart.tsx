"use client"
import { LineChart } from "lucide-react"

export function DummyLineChart({ title }: { title: string }) {
  return (
    <div className="text-center text-muted-foreground">
      <LineChart className="mx-auto h-12 w-12 mb-2" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs">(Line Chart Placeholder)</p>
    </div>
  )
}
