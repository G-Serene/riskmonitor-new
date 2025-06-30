// API client for backend integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface NewsArticle {
  id: number
  headline: string
  summary: string
  source_name: string
  published_date: string
  severity_level: "Critical" | "High" | "Medium" | "Low"
  primary_risk_category: string
  overall_risk_score: number
  confidence_score: number
  sentiment_score: number
  impact_score: number
  temporal_impact: string
  urgency_level: "Critical" | "High" | "Medium" | "Low"
  countries: string[]
  industry_sectors: string | string[]
  coordinates: { lat: number; lng: number } | null
  risk_color: string
  is_breaking_news: boolean
  is_market_moving: boolean
  is_regulatory: boolean
  is_trending: boolean
  requires_action: boolean
  keywords: string[]
  entities: string[]
  minutes_ago?: number  // For recent news feed with relative time
}

export interface DashboardSummary {
  overall_risk_score: number
  risk_trend: "Rising" | "Falling" | "Stable" | "Volatile"
  critical_alerts: number
  total_news_today: number
  critical_count: number
  high_count: number
  avg_sentiment: number
  current_risk_score: number
}

export interface SentimentAnalysis {
  positive_pct: number
  neutral_pct: number
  negative_pct: number
}

export interface TrendingTopic {
  keyword: string
  frequency: number
  avg_impact_score: number
  latest_mention: string
  recent_mentions: number
  avg_risk_level: string
}

export interface RiskBreakdown {
  category: string
  news_count: number
  percentage: number
  chart_color: string
}

export interface GeographicRisk {
  country: string
  region: string
  coordinates: { lat: number; lng: number } | null
  news_count: number
  risk_weight: number
  avg_sentiment: number
  latest_news_date: string
}

export interface DashboardData {
  dashboard_summary: DashboardSummary
  sentiment_analysis: SentimentAnalysis
  trending_topics: TrendingTopic[]
  risk_breakdown: RiskBreakdown[]
  geographic_risk: GeographicRisk[]
  generated_at: string
  cache_timestamp?: string
}

export interface NewsResponse {
  articles: NewsArticle[]
  total_count: number
  page_info: {
    limit: number
    offset: number
    has_more: boolean
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Dashboard endpoints
  async getDashboardData(): Promise<DashboardData> {
    return this.get<DashboardData>("/api/risk/dashboard")
  }

  // News endpoints
  async getLatestNews(params?: {
    limit?: number
    offset?: number
    severity?: string
    risk_category?: string
    is_trending?: boolean
    is_breaking?: boolean
  }): Promise<NewsResponse> {
    return this.get<NewsResponse>("/api/news/latest", params)
  }

  async getNewsFeed(limit = 20): Promise<{ articles: NewsArticle[]; count: number; generated_at: string }> {
    return this.get("/api/news/feed", { limit })
  }

  async getNewsArticle(id: number): Promise<NewsArticle> {
    return this.get<NewsArticle>(`/api/news/${id}`)
  }

  // Analytics endpoints
  async getTrendAnalytics(days = 7) {
    return this.get("/api/analytics/trends", { days })
  }

  async getRiskCalculations(params?: { limit?: number; days?: number }) {
    return this.get("/api/risk/calculations", params)
  }

  // Market exposure functionality removed as requested

  // Health check
  async healthCheck() {
    return this.get("/api/health")
  }
}

export const apiClient = new ApiClient()
