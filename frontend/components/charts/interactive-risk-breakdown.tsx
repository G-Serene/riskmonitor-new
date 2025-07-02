"use client"

import { useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NewsArticle } from "@/lib/api-client"

interface InteractiveRiskBreakdownProps {
  newsData: NewsArticle[]
  timeWindowDescription?: string
}

type BreakdownType = 'severity' | 'risk_category' | 'urgency' | 'countries' | 'sources'

const BREAKDOWN_OPTIONS = [
  { value: 'severity', label: 'Severity Level', description: 'Critical, High, Medium, Low' },
  { value: 'risk_category', label: 'Risk Category', description: 'Credit, Market, Operational, etc.' },
  { value: 'urgency', label: 'Urgency Level', description: 'Immediate action required' },
  { value: 'countries', label: 'Geographic Regions', description: 'Top affected countries' },
  { value: 'sources', label: 'News Sources', description: 'Information providers' }
]

const COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f59e0b'  // amber-500
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.count} articles ({data.percentage.toFixed(1)}%)
        </p>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="grid grid-cols-2 gap-1 mt-3 text-xs">
      {payload?.slice(0, 6).map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground truncate text-xs">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function InteractiveRiskBreakdown({ 
  newsData, 
  timeWindowDescription 
}: InteractiveRiskBreakdownProps) {
  const [selectedBreakdown, setSelectedBreakdown] = useState<BreakdownType>('severity')

  const chartData = useMemo(() => {
    if (!newsData || newsData.length === 0) return []

    let breakdown: Record<string, number> = {}

    switch (selectedBreakdown) {
      case 'severity':
        newsData.forEach(article => {
          const key = article.severity_level || 'Unknown'
          breakdown[key] = (breakdown[key] || 0) + 1
        })
        break

      case 'risk_category':
        newsData.forEach(article => {
          const key = article.primary_risk_category
            ?.replace(/_/g, ' ')
            ?.replace(/\b\w/g, l => l.toUpperCase()) || 'Other'
          breakdown[key] = (breakdown[key] || 0) + 1
        })
        break

      case 'urgency':
        newsData.forEach(article => {
          const key = article.urgency_level || 'Medium'
          breakdown[key] = (breakdown[key] || 0) + 1
        })
        break

      case 'countries':
        newsData.forEach(article => {
          if (article.countries && article.countries.length > 0) {
            article.countries.forEach(country => {
              breakdown[country] = (breakdown[country] || 0) + 1
            })
          } else {
            breakdown['Global'] = (breakdown['Global'] || 0) + 1
          }
        })
        // Keep only top 8 countries
        const sortedCountries = Object.entries(breakdown)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8)
        breakdown = Object.fromEntries(sortedCountries)
        break

      case 'sources':
        newsData.forEach(article => {
          const key = article.source_name || 'Unknown'
          breakdown[key] = (breakdown[key] || 0) + 1
        })
        // Keep only top 6 sources
        const sortedSources = Object.entries(breakdown)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
        breakdown = Object.fromEntries(sortedSources)
        break
    }

    const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0)
    
    return Object.entries(breakdown)
      .map(([name, count], index) => ({
        name,
        count,
        percentage: (count / total) * 100,
        fill: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count)
  }, [newsData, selectedBreakdown])

  if (!newsData || newsData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Distribution analysis ({timeWindowDescription || "last 24 hours"})
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="text-center text-muted-foreground">
            <div className="h-12 w-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
              📊
            </div>
            <p className="text-sm">No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedOption = BREAKDOWN_OPTIONS.find(opt => opt.value === selectedBreakdown)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Risk Breakdown</CardTitle>
            <CardDescription className="text-xs">
              {selectedOption?.description} ({timeWindowDescription || "last 24 hours"})
            </CardDescription>
          </div>
          <Select 
            value={selectedBreakdown} 
            onValueChange={(value) => setSelectedBreakdown(value as BreakdownType)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BREAKDOWN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">{newsData.length}</span>
          <span className="text-xs text-muted-foreground ml-1">articles</span>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0">
        {chartData.length > 0 ? (
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  outerRadius={60}
                  innerRadius={25}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  content={<CustomLegend />} 
                  wrapperStyle={{ paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No breakdown data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 