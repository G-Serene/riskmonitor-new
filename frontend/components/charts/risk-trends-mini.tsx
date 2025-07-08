"use client"

import { useMemo, useState } from "react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { NewsArticle } from "@/lib/api-client"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface RiskTrendsMiniProps {
  newsData: NewsArticle[]
  timeWindowDescription?: string
  currentRiskScore?: number
}

type TrendPeriod = "day" | "week" | "month"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm text-muted-foreground">Risk Score: {data.riskScore.toFixed(1)}</p>
        <p className="text-xs text-muted-foreground">{data.articleCount} articles</p>
      </div>
    )
  }
  return null
}

export function RiskTrendsMini({ newsData, timeWindowDescription, currentRiskScore = 0 }: RiskTrendsMiniProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>("day")

  const { chartData, trend, trendPercentage } = useMemo(() => {
    if (!newsData || newsData.length === 0) {
      return { chartData: [], trend: "stable", trendPercentage: 0 }
    }

    const now = new Date()
    const timeSlots = []

    // Configure time periods based on selected filter
    let numSlots: number
    let intervalMs: number
    let formatLabel: (date: Date) => string

    switch (selectedPeriod) {
      case "day":
        // Last 10 days
        numSlots = 10
        intervalMs = 24 * 60 * 60 * 1000 // 1 day
        formatLabel = (date: Date) => {
          const today = new Date()
          const diffDays = Math.floor((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
          return diffDays === 0 ? "Today" : diffDays === 1 ? "1d ago" : `${diffDays}d ago`
        }
        break
      case "week":
        // Last 8 weeks
        numSlots = 8
        intervalMs = 7 * 24 * 60 * 60 * 1000 // 1 week
        formatLabel = (date: Date) => {
          const weekStart = new Date(date)
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week
          return `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
        }
        break
      case "month":
        // Last 6 months
        numSlots = 6
        intervalMs = 30 * 24 * 60 * 60 * 1000 // ~1 month
        formatLabel = (date: Date) => {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          return monthNames[date.getMonth()]
        }
        break
    }

    // Create time slots
    for (let i = numSlots - 1; i >= 0; i--) {
      const slotEnd = new Date(now.getTime() - i * intervalMs)
      const slotStart = new Date(slotEnd.getTime() - intervalMs)

      const articlesInSlot = newsData.filter((article) => {
        // Handle both minutes_ago and published_date timestamps
        let articleTime: Date

        if (article.minutes_ago !== undefined) {
          articleTime = new Date(now.getTime() - article.minutes_ago * 60 * 1000)
        } else if (article.published_date) {
          articleTime = new Date(article.published_date)
        } else {
          // If no timestamp, assume it's recent
          articleTime = now
        }

        return articleTime >= slotStart && articleTime < slotEnd
      })

      const avgRiskScore =
        articlesInSlot.length > 0
          ? articlesInSlot.reduce((sum, article) => sum + (article.overall_risk_score || 0), 0) / articlesInSlot.length
          : 0

      timeSlots.push({
        time: formatLabel(slotEnd),
        riskScore: avgRiskScore,
        articleCount: articlesInSlot.length,
        timestamp: slotEnd.getTime(),
      })
    }

    // Calculate trend
    const validSlots = timeSlots.filter((slot) => slot.riskScore > 0)
    let trendDirection = "stable"
    let trendPercent = 0

    if (validSlots.length >= 2) {
      const firstScore = validSlots[0].riskScore
      const lastScore = validSlots[validSlots.length - 1].riskScore
      const change = lastScore - firstScore
      trendPercent = firstScore > 0 ? (change / firstScore) * 100 : 0

      if (Math.abs(trendPercent) < 5) {
        trendDirection = "stable"
      } else if (trendPercent > 0) {
        trendDirection = "rising"
      } else {
        trendDirection = "falling"
      }
    }

    return {
      chartData: timeSlots,
      trend: trendDirection,
      trendPercentage: Math.abs(trendPercent),
    }
  }, [newsData, selectedPeriod])

  const getTrendIcon = () => {
    switch (trend) {
      case "rising":
        return <TrendingUp className="w-4 h-4 text-red-500" />
      case "falling":
        return <TrendingDown className="w-4 h-4 text-green-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case "rising":
        return "text-red-600"
      case "falling":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  const getTrendText = () => {
    switch (trend) {
      case "rising":
        return `↗ ${trendPercentage.toFixed(1)}% increase`
      case "falling":
        return `↘ ${trendPercentage.toFixed(1)}% decrease`
      default:
        return "Stable trend"
    }
  }

  const getPeriodDescription = () => {
    switch (selectedPeriod) {
      case "day":
        return "Last 10 days"
      case "week":
        return "Last 8 weeks"
      case "month":
        return "Last 6 months"
    }
  }

  if (!newsData || newsData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <CardTitle className="text-base">Risk Trends</CardTitle>
              <CardDescription className="text-xs">{getPeriodDescription()} evolution</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant={selectedPeriod === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("day")}
                className="h-6 px-2 text-xs"
              >
                Days
              </Button>
              <Button
                variant={selectedPeriod === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("week")}
                className="h-6 px-2 text-xs"
              >
                Weeks
              </Button>
              <Button
                variant={selectedPeriod === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("month")}
                className="h-6 px-2 text-xs"
              >
                Months
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[120px]">
          <div className="text-center text-muted-foreground">
            <div className="h-8 w-8 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">📈</div>
            <p className="text-sm">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate optimal Y-axis domain for better visualization
  const validDataPoints = chartData.filter((d) => d.riskScore > 0).map((d) => d.riskScore)
  const allDataPoints = [...validDataPoints, currentRiskScore].filter((score) => score > 0)

  let yAxisDomain: [number, number] = [0, 10]

  if (allDataPoints.length > 0) {
    const minScore = Math.min(...allDataPoints)
    const maxScore = Math.max(...allDataPoints)
    const range = maxScore - minScore

    // If the range is very small, create a more focused view
    if (range < 1) {
      const center = (minScore + maxScore) / 2
      const padding = Math.max(0.5, range * 0.5) // At least 0.5 padding
      yAxisDomain = [Math.max(0, center - padding), center + padding]
    } else {
      // Add 20% padding to top and bottom
      const padding = range * 0.2
      yAxisDomain = [Math.max(0, minScore - padding), maxScore + padding]
    }

    // Ensure minimum range for readability
    if (yAxisDomain[1] - yAxisDomain[0] < 2) {
      const center = (yAxisDomain[0] + yAxisDomain[1]) / 2
      yAxisDomain = [Math.max(0, center - 1), center + 1]
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle className="text-base">Risk Trends</CardTitle>
            <CardDescription className="text-xs">{getPeriodDescription()} evolution</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={selectedPeriod === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("day")}
              className="h-6 px-2 text-xs"
            >
              Days
            </Button>
            <Button
              variant={selectedPeriod === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("week")}
              className="h-6 px-2 text-xs"
            >
              Weeks
            </Button>
            <Button
              variant={selectedPeriod === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("month")}
              className="h-6 px-2 text-xs"
            >
              Months
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>{getTrendText()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold">{currentRiskScore.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground ml-1">current</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">
              Avg: {(() => {
                const validData = chartData.filter((d) => d.riskScore > 0)
                return validData.length > 0
                  ? (validData.reduce((sum, d) => sum + d.riskScore, 0) / validData.length).toFixed(1)
                  : "0.0"
              })()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="h-[120px] p-4 border border-border/20 rounded-lg bg-muted/10">
          {chartData.some((d) => d.riskScore > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 10 }}>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis
                  domain={yAxisDomain}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#666" }}
                  width={30}
                  tickCount={5}
                  tickFormatter={(value) => value.toFixed(1)}
                />

                {/* Reference line for current risk score */}
                {currentRiskScore > 0 && currentRiskScore >= yAxisDomain[0] && currentRiskScore <= yAxisDomain[1] && (
                  <ReferenceLine y={currentRiskScore} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} />
                )}

                <Line
                  type="monotone"
                  dataKey="riskScore"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", strokeWidth: 1, r: 3 }}
                  activeDot={{ r: 4, fill: "#ef4444" }}
                  connectNulls={false}
                />

                <Tooltip content={<CustomTooltip />} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <div className="text-2xl mb-2">📊</div>
                <p className="text-sm">No trend data available</p>
                <p className="text-xs">Data will appear as articles are analyzed</p>
              </div>
            </div>
          )}
        </div>

        {/* Mini stats */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
          <span>Peak: {Math.max(...chartData.map((d) => d.riskScore), 0).toFixed(1)}</span>
          <span>
            Low: {(() => {
              const validData = chartData.filter((d) => d.riskScore > 0)
              return validData.length > 0
                ? Math.min(...validData.map((d) => d.riskScore), currentRiskScore).toFixed(1)
                : currentRiskScore.toFixed(1)
            })()}
          </span>
          <span>Articles: {newsData.length}</span>
        </div>
      </CardContent>
    </Card>
  )
}
