"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { TrendingRiskTopic } from "@/types/trending-risks"

interface TrendingRisksChartProps {
  data: TrendingRiskTopic[]
  className?: string
}

export function TrendingRisksChart({ data, className }: TrendingRisksChartProps) {
  // Color mapping for risk levels
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "#dc2626" // red-600
      case "high":
        return "#ea580c" // orange-600
      case "medium":
        return "#ca8a04" // yellow-600
      case "low":
        return "#16a34a" // green-600
      default:
        return "#6b7280" // gray-500
    }
  }

  // Prepare data for chart
  const chartData = data.slice(0, 10).map((topic) => ({
    topic: topic.topic.length > 20 ? topic.topic.substring(0, 20) + "..." : topic.topic,
    fullTopic: topic.topic,
    mentions: topic.mentions,
    velocity: topic.velocity,
    sentiment: topic.sentiment_avg,
    riskLevel: topic.risk_level,
    impactScore: topic.impact_score,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.fullTopic}</p>
          <p className="text-sm text-muted-foreground">Mentions: {data.mentions}</p>
          <p className="text-sm text-muted-foreground">Velocity: {(data.velocity * 100).toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">Sentiment: {data.sentiment.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            Risk Level: <span className="capitalize">{data.riskLevel}</span>
          </p>
          <p className="text-sm text-muted-foreground">Impact Score: {data.impactScore.toFixed(1)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} fontSize={12} />
          <YAxis label={{ value: "Mentions", angle: -90, position: "insideLeft" }} fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="mentions" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getRiskColor(entry.riskLevel)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
