"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import type { TrendingTopic } from "@/lib/api-client"

// Configurable limit for trending topics - change this to adjust how many topics are shown
const TRENDING_TOPICS_LIMIT = 8

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

  // Generate improved word cloud positions with better spacing
  const getWordPosition = (index: number, total: number, word: string) => {
    if (index === 0) {
      // First word (most frequent) in center
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }
    }
    
    // Improved positioning algorithm with better spacing
    const wordsPerLayer = [0, 6, 8, 10, 12] // Variable words per layer for better distribution
    let currentLayer = 1
    let remainingIndex = index - 1
    
    // Find which layer this word belongs to
    while (remainingIndex >= wordsPerLayer[currentLayer] && currentLayer < wordsPerLayer.length - 1) {
      remainingIndex -= wordsPerLayer[currentLayer]
      currentLayer++
    }
    
    // Position within the layer
    const posInLayer = remainingIndex
    const wordsInThisLayer = wordsPerLayer[currentLayer] || 12
    const angleStep = (2 * Math.PI) / wordsInThisLayer
    const angle = posInLayer * angleStep + (currentLayer * 0.3) // Slight rotation offset per layer
    
    // Dynamic radius based on layer and word length
    const baseRadius = currentLayer * 45 // Increased base spacing
    const wordLengthFactor = Math.min(word.length * 2, 20) // Account for word length
    const radius = baseRadius + wordLengthFactor
    
    const centerX = 50
    const centerY = 50
    
    const x = centerX + (Math.cos(angle) * radius * 0.75) // Reduced spread for better fit
    const y = centerY + (Math.sin(angle) * radius * 0.55) // Reduced vertical spread
    
    return {
      left: `${Math.max(8, Math.min(92, x))}%`,
      top: `${Math.max(15, Math.min(85, y))}%`,
      transform: 'translate(-50%, -50%)'
    }
  }

  // Sort by frequency for better layout
  const sortedTopics = [...data]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, TRENDING_TOPICS_LIMIT) // Use configurable limit instead of hardcoded 18

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
        <div className="relative min-h-[200px] w-full overflow-hidden">
          {sortedTopics.map((topic, index) => {
            const style = getWordStyle(topic, index)
            const position = getWordPosition(index, sortedTopics.length, topic.keyword)
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
          <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
            No trending topics found
          </div>
        )}
      </CardContent>
    </Card>
  )
}