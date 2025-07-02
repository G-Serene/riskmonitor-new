"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NewsArticle } from "@/lib/api-client"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface RiskTrendsMiniProps {
  newsData: NewsArticle[]
  timeWindowDescription?: string
  currentRiskScore?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm text-muted-foreground">
          Risk Score: {data.riskScore.toFixed(1)}
        </p>
        <p className="text-xs text-muted-foreground">
          {data.articleCount} articles
        </p>
      </div>
    )
  }
  return null
}

export function RiskTrendsMini({ 
  newsData, 
  timeWindowDescription,
  currentRiskScore = 0
}: RiskTrendsMiniProps) {
  const { chartData, trend, trendPercentage } = useMemo(() => {
    if (!newsData || newsData.length === 0) {
      return { chartData: [], trend: 'stable', trendPercentage: 0 }
    }

    // Group articles by time periods (last 24 hours in 4-hour chunks)
    const now = new Date()
    const timeSlots = []
    
    // Create 6 time slots for the last 24 hours (4-hour intervals)
    for (let i = 5; i >= 0; i--) {
      const slotEnd = new Date(now.getTime() - (i * 4 * 60 * 60 * 1000))
      const slotStart = new Date(slotEnd.getTime() - (4 * 60 * 60 * 1000))
      
             const articlesInSlot = newsData.filter(article => {
         if (article.minutes_ago === undefined) return false
         const articleTime = new Date(now.getTime() - (article.minutes_ago * 60 * 1000))
         return articleTime >= slotStart && articleTime < slotEnd
       })

      const avgRiskScore = articlesInSlot.length > 0
        ? articlesInSlot.reduce((sum, article) => sum + article.overall_risk_score, 0) / articlesInSlot.length
        : 0

      // Format time label
      const timeLabel = slotEnd.getHours().toString().padStart(2, '0') + ':00'
      
      timeSlots.push({
        time: timeLabel,
        riskScore: avgRiskScore,
        articleCount: articlesInSlot.length,
        timestamp: slotEnd.getTime()
      })
    }

    // Calculate trend
    const validSlots = timeSlots.filter(slot => slot.riskScore > 0)
    let trendDirection = 'stable'
    let trendPercent = 0

    if (validSlots.length >= 2) {
      const firstScore = validSlots[0].riskScore
      const lastScore = validSlots[validSlots.length - 1].riskScore
      const change = lastScore - firstScore
      trendPercent = firstScore > 0 ? (change / firstScore) * 100 : 0

      if (Math.abs(trendPercent) < 5) {
        trendDirection = 'stable'
      } else if (trendPercent > 0) {
        trendDirection = 'rising'
      } else {
        trendDirection = 'falling'
      }
    }

    return {
      chartData: timeSlots,
      trend: trendDirection,
      trendPercentage: Math.abs(trendPercent)
    }
  }, [newsData])

  const getTrendIcon = () => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'falling':
        return <TrendingDown className="w-4 h-4 text-green-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'rising':
        return 'text-red-600'
      case 'falling':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendText = () => {
    switch (trend) {
      case 'rising':
        return `↗ ${trendPercentage.toFixed(1)}% increase`
      case 'falling':
        return `↘ ${trendPercentage.toFixed(1)}% decrease`
      default:
        return 'Stable trend'
    }
  }

  if (!newsData || newsData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk Trends</CardTitle>
          <CardDescription className="text-xs">
            24-hour risk evolution ({timeWindowDescription || "last 24 hours"})
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[120px]">
          <div className="text-center text-muted-foreground">
            <div className="h-8 w-8 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
              📈
            </div>
            <p className="text-sm">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxRiskScore = Math.max(...chartData.map(d => d.riskScore), currentRiskScore, 5)

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Risk Trends</CardTitle>
            <CardDescription className="text-xs">
              24-hour evolution ({timeWindowDescription || "last 24 hours"})
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {getTrendText()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold">{currentRiskScore.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground ml-1">current</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">
              Avg: {chartData.length > 0 
                ? (chartData.reduce((sum, d) => sum + d.riskScore, 0) / chartData.filter(d => d.riskScore > 0).length || 0).toFixed(1)
                : "0.0"
              }
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#666' }}
              />
              <YAxis 
                domain={[0, maxRiskScore + 1]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#666' }}
                width={25}
              />
              
              {/* Reference line for current risk score */}
              <ReferenceLine 
                y={currentRiskScore} 
                stroke="#3b82f6" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              
              <Line
                type="monotone"
                dataKey="riskScore"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 1, r: 3 }}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
              
              <Tooltip content={<CustomTooltip />} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Mini stats */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
          <span>
            Peak: {Math.max(...chartData.map(d => d.riskScore), 0).toFixed(1)}
          </span>
          <span>
            Low: {chartData.length > 0 
              ? Math.min(...chartData.filter(d => d.riskScore > 0).map(d => d.riskScore), currentRiskScore).toFixed(1)
              : "0.0"
            }
          </span>
          <span>
            Articles: {newsData.length}
          </span>
        </div>
      </CardContent>
    </Card>
  )
} 