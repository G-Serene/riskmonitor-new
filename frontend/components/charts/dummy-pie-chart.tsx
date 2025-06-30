"use client"
import { PieChart } from "lucide-react"

export function DummyPieChart({ title }: { title: string }) {
  return (
    <div className="text-center text-muted-foreground">
      <PieChart className="mx-auto h-12 w-12 mb-2" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs">(Pie Chart Placeholder)</p>
    </div>
  )
}
