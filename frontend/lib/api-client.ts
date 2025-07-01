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
  // Theme-related fields
  primary_theme?: string
  theme_display_name?: string
  theme_confidence?: number
  theme_keywords?: string[]
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

export interface ThemeStatistics {
  theme_id: string
  theme_name: string
  article_count: number
  avg_risk_score: number
  avg_confidence: number
  critical_count: number
  market_moving_count: number
}

export interface ThemeStatisticsResponse {
  themes: ThemeStatistics[]
  total_themes: number
  total_articles: number
  generated_at: string
}

export interface ThemeArticlesResponse {
  theme_id: string
  theme_name: string
  articles: NewsArticle[]
  total_count: number
}

export interface StorylineResponse {
  theme_id: string
  theme_name: string
  storyline: string
  context: {
    theme_name: string
    article_count: number
    total_exposure: number
    date_range: {
      start: string
      end: string
    }
    geographic_scope: {
      countries: string[]
      country_count: number
      cross_country_events: Record<string, string[]>
    }
    market_scope: {
      markets: string[]
      market_count: number
      cross_market_events: Record<string, string[]>
    }
    severity_distribution: {
      Critical: number
      High: number
      Medium: number
      Low: number
    }
    avg_risk_score: number
    max_risk_score: number
  }
  report_data: {
    report_metadata: {
      title: string
      generated_at: string
      report_id: string
      analyst: string
      classification: string
    }
    executive_summary: any
    storyline_content: string
    supporting_data: any
    article_references: Array<{
      id: number
      headline: string
      source: string
      date: string
      severity: string
      risk_score: number
      countries: string[]
      financial_exposure: number
    }>
    risk_metrics: any
  }
  metadata: {
    articles_analyzed: number
    articles_selected: number
    total_exposure: number
    affected_countries: string[]
    affected_markets: string[]
    severity_distribution: Record<string, number>
    avg_risk_score: number
    generation_date: string
  }
}

export interface RecentStorylinesResponse {
  storylines: Array<{
    theme_id: string
    theme_name: string
    storyline: string
    generated_at: string
    article_count: number
  }>
  total_count: number
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

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
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

  // Theme-based endpoints
  async getThemeStatistics(): Promise<ThemeStatisticsResponse> {
    return this.get<ThemeStatisticsResponse>("/api/themes/statistics")
  }

  async getThemeArticles(themeId: string): Promise<ThemeArticlesResponse> {
    return this.get<ThemeArticlesResponse>(`/api/themes/${themeId}/articles`)
  }

  async generateThemeStoryline(
    themeId: string, 
    maxArticles: number = 50, 
    daysBack: number = 30
  ): Promise<StorylineResponse> {
    return this.post<StorylineResponse>(`/api/themes/${themeId}/storyline?max_articles=${maxArticles}&days_back=${daysBack}`, {})
  }

  async downloadStorylineReport(themeId: string) {
    const url = `${this.baseUrl}/api/themes/${themeId}/storyline/download?format=pdf`
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      // Create download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      
      // Extract filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `risk_impact_assessment_${themeId}_${new Date().toISOString().split('T')[0]}.html`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '')
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      return { success: true, filename }
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
  }

  async getRecentStorylines(): Promise<RecentStorylinesResponse> {
    return this.get<RecentStorylinesResponse>("/api/storylines")
  }
}

export const apiClient = new ApiClient()
