"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import type { TrendingTopic } from "@/lib/api-client"

interface TrendingTopicsWordCloudProps {
  data: TrendingTopic[]
  className?: string
}

export function TrendingTopicsWordCloud({ data, className = "" }: TrendingTopicsWordCloudProps) {
  // Calculate relative sizes and colors
  const maxFrequency = Math.max(...data.map(t => t.frequency))
  const minFrequency = Math.min(...data.map(t => t.frequency))
  
  const getWordStyle = (topic: TrendingTopic, index: number) => {
    // Font size based on frequency (0.8rem to 1.6rem for compact space)
    const sizeRatio = (topic.frequency - minFrequency) / (maxFrequency - minFrequency)
    const fontSize = 0.8 + (sizeRatio * 0.8) // 0.8rem to 1.6rem
    
    // Word cloud color palette (vibrant and varied like the example)
    const colors = [
      'text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500',
      'text-red-500', 'text-cyan-500', 'text-pink-500', 'text-yellow-500',
      'text-indigo-500', 'text-teal-500', 'text-rose-500', 'text-emerald-500',
      'text-violet-500', 'text-amber-500', 'text-lime-500', 'text-sky-500'
    ]
    
    // Assign color based on risk level with variety
    const getRiskColor = (avgRiskLevel: string, idx: number) => {
      const riskNum = parseFloat(avgRiskLevel)
      if (riskNum >= 3.5) return 'text-red-500'      // Critical - always red
      if (riskNum >= 2.5) return 'text-orange-500'   // High - always orange
      return colors[idx % colors.length]             // Medium/Low - varied colors
    }
    
    // Weight based on recent activity
    const recentActivityRatio = topic.recent_mentions / topic.frequency
    const fontWeight = recentActivityRatio > 0.3 ? 'font-bold' : 'font-medium'
    
    return {
      fontSize: `${fontSize}rem`,
      lineHeight: '1.1',
      color: getRiskColor(topic.avg_risk_level.toString(), index),
      fontWeight
    }
  }

  // Generate circular word cloud positions
  const getWordPosition = (index: number, total: number) => {
    if (index === 0) {
      // First word (most frequent) in center
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }
    
    // Create concentric circles for other words
    const layer = Math.floor((index - 1) / 6) + 1 // 6 words per layer
    const posInLayer = (index - 1) % 6
    const angleStep = (2 * Math.PI) / 6 // 6 positions per circle
    const angle = posInLayer * angleStep
    
    const radius = layer * 35 // Distance from center
    const centerX = 50
    const centerY = 50
    
    const x = centerX + (Math.cos(angle) * radius * 0.85) // 0.85 for controlled spread
    const y = centerY + (Math.sin(angle) * radius * 0.65) // 0.65 for compact height
    
    return {
      left: `${Math.max(10, Math.min(90, x))}%`,
      top: `${Math.max(20, Math.min(80, y))}%`,
      transform: 'translate(-50%, -50%)'
    }
  }

  // Sort by frequency for better layout
  const sortedTopics = [...data]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 18) // More topics with increased space

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <CardTitle className="text-sm font-medium">Trending Topics</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Last 10 days • {data.length} topics tracked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative min-h-[160px] w-full overflow-hidden">
          {sortedTopics.map((topic, index) => {
            const style = getWordStyle(topic, index)
            const position = getWordPosition(index, sortedTopics.length)
            return (
              <span
                key={topic.keyword}
                className={`absolute cursor-default hover:scale-110 transition-transform duration-200 ${style.color} ${style.fontWeight} select-none whitespace-nowrap`}
                style={{
                  fontSize: style.fontSize,
                  lineHeight: style.lineHeight,
                  left: position.left,
                  top: position.top,
                  transform: position.transform
                }}
                title={`${topic.keyword}: ${topic.frequency} mentions, Impact: ${topic.avg_impact_score.toFixed(1)}, Recent: ${topic.recent_mentions}`}
              >
                {topic.keyword}
              </span>
            )
          })}
        </div>
        
        {sortedTopics.length === 0 && (
          <div className="flex items-center justify-center min-h-[160px] text-muted-foreground text-sm">
            No trending topics found
          </div>
        )}
      </CardContent>
    </Card>
  )
} 