"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface RiskBreakdownData {
  category: string
  news_count: number
  percentage: number
  chart_color: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">
          {data.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </p>
        <p className="text-sm text-muted-foreground">
          {data.news_count} articles ({data.percentage.toFixed(1)}%)
        </p>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap gap-1 justify-center mt-2">
      {payload?.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground truncate max-w-[80px]">
            {entry.value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RiskBreakdownPieChart({ data }: { data: RiskBreakdownData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
            📊
          </div>
          <p>No risk breakdown data available</p>
        </div>
      </div>
    )
  }

  // Transform data for Recharts
  const chartData = data.map(item => ({
    ...item,
    name: item.category,
    value: item.percentage,
    fill: item.chart_color
  }))

  return (
    <div className="h-full w-full">
      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={30}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.chart_color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
