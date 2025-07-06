"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react"
import type { TrendingRiskTopic } from "@/types/trending-risks"

// Configurable limit for trending topics - change this to adjust how many topics are shown
const TRENDING_TOPICS_LIMIT = 8

interface TrendingRisksDetailedProps {
  data: TrendingRiskTopic[]
}

export function TrendingRisksDetailed({ data }: TrendingRisksDetailedProps) {
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "rising":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "declining":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500 hover:bg-red-600"
      case "high":
        return "bg-orange-500 hover:bg-orange-600"
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "low":
        return "bg-green-500 hover:bg-green-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  return (
    <div className="space-y-4">
      {data.slice(0, TRENDING_TOPICS_LIMIT).map((topic, index) => (
        <Card key={topic.topic} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                  {topic.topic}
                  {getTrendIcon(topic.trend_direction)}
                </CardTitle>
                <CardDescription className="mt-1">
                  {topic.mentions} mentions • {topic.countries_affected.length} countries affected
                </CardDescription>
              </div>
              <Badge className={`${getRiskBadgeColor(topic.risk_level)} text-white`}>
                {topic.risk_level.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Velocity</p>
                <p className="font-semibold text-sm">
                  {topic.velocity > 0 ? "+" : ""}
                  {(topic.velocity * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sentiment</p>
                <p
                  className={`font-semibold text-sm ${
                    topic.sentiment_avg > 0
                      ? "text-green-600"
                      : topic.sentiment_avg < 0
                        ? "text-red-600"
                        : "text-gray-600"
                  }`}
                >
                  {topic.sentiment_avg.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Impact Score</p>
                <p className="font-semibold text-sm">{topic.impact_score.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peak Date</p>
                <p className="font-semibold text-sm">{new Date(topic.peak_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Countries Affected:</p>
              <div className="flex flex-wrap gap-1">
                {topic.countries_affected.slice(0, 5).map((country) => (
                  <Badge key={country} variant="outline" className="text-xs">
                    {country}
                  </Badge>
                ))}
                {topic.countries_affected.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{topic.countries_affected.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Sample Headlines:</p>
              <ul className="text-sm space-y-1">
                {topic.sample_headlines.slice(0, 2).map((headline, idx) => (
                  <li key={idx} className="text-muted-foreground truncate">
                    • {headline}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-1">
                {topic.related_keywords.slice(0, 3).map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
