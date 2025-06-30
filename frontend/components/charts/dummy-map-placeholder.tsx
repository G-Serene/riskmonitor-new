"use client"
import { Map } from "lucide-react"

export function DummyMapPlaceholder({ title }: { title: string }) {
  return (
    <div className="text-center text-muted-foreground w-full h-full flex flex-col items-center justify-center bg-muted/50 rounded-md">
      <Map className="mx-auto h-16 w-16 mb-4 text-primary" />
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm">(Interactive Map Placeholder)</p>
    </div>
  )
}
