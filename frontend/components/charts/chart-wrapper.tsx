"use client"
import type React from "react"

interface ChartWrapperProps {
  content: React.ComponentType<any>
  title: string
  className?: string
}

export function ChartWrapper({ content: Content, title, className }: ChartWrapperProps) {
  return (
    <div className={`w-full h-full p-4 border rounded-lg bg-card flex items-center justify-center ${className}`}>
      <Content title={title} />
    </div>
  )
}
