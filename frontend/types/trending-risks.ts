export interface NewsItem {
  id: string
  title: string
  content: string
  source: string
  date: string
  sentiment_score: number
  risk_category: string
  country: string
  entities: string[] // Extracted entities (companies, people, places)
  keywords: string[] // Key terms and phrases
  topics: string[] // Classified topics
}

export interface TrendingRiskTopic {
  topic: string
  mentions: number
  sentiment_avg: number
  velocity: number // Rate of increase in mentions
  countries_affected: string[]
  risk_level: "low" | "medium" | "high" | "critical"
  trend_direction: "rising" | "stable" | "declining"
  related_keywords: string[]
  sample_headlines: string[]
  first_mentioned: string
  peak_date: string
  impact_score: number
}

export interface TrendingRisksData {
  topics: TrendingRiskTopic[]
  time_period: string
  last_updated: string
  total_articles_analyzed: number
}
