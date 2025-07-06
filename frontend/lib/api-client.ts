// API client for backend integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export type TimeWindow = "1h" | "4h" | "8h" | "12h" | "today" | "yesterday" | "3d" | "7d" | "14d" | "1m" | "3m" | "6m" | "custom"

export interface TimeWindowOption {
  value: TimeWindow
  label: string
  description: string
}

export const TIME_WINDOW_OPTIONS: TimeWindowOption[] = [
  { value: "1h", label: "Last Hour", description: "Past 60 minutes" },
  { value: "4h", label: "Last 4 Hours", description: "Past 4 hours" },
  { value: "8h", label: "Last 8 Hours", description: "Past 8 hours" },
  { value: "12h", label: "Last 12 Hours", description: "Past 12 hours" },
  { value: "today", label: "Today", description: "Midnight to current time" },
  { value: "yesterday", label: "Yesterday", description: "Previous day (midnight to midnight)" },
  { value: "3d", label: "Last 3 Days", description: "Past 3 days" },
  { value: "7d", label: "Last 7 Days", description: "Past 7 days" },
  { value: "14d", label: "Last 14 Days", description: "Past 14 days" },
  { value: "1m", label: "Last Month", description: "Past 30 days" },
  { value: "3m", label: "Last 3 Months", description: "Past 90 days" },
  { value: "6m", label: "Last 6 Months", description: "Past 180 days (dashboard limit)" },
  { value: "custom", label: "Custom Range", description: "Select specific date range" },
]

// Helper function to check if a time window is considered "live" vs "historical"
export const isLiveTimeWindow = (timeWindow: TimeWindow): boolean => {
  return ["1h", "4h", "8h", "12h", "today", "7d"].includes(timeWindow)
}

// Helper function to get the maximum allowed time window for dashboard
export const getMaxDashboardTimeWindow = (): TimeWindow => {
  return "6m"
}

// Helper function to validate time window for dashboard
export const isDashboardTimeWindowValid = (timeWindow: TimeWindow): boolean => {
  const maxIndex = TIME_WINDOW_OPTIONS.findIndex(opt => opt.value === "6m")
  const currentIndex = TIME_WINDOW_OPTIONS.findIndex(opt => opt.value === timeWindow)
  return currentIndex <= maxIndex
}

export interface DateRange {
  from?: Date
  to?: Date
}

export interface NewsArticle {
  id: number
  headline: string
  content?: string  // Full article content
  summary: string
  source_name: string
  source_url?: string  // Original source URL
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
  // Historical impact analysis
  historical_impact_analysis?: string  // LLM-generated analysis of similar past events' impact on international banks
}

export interface DashboardSummary {
  overall_risk_score: number
  risk_trend: "Rising" | "Falling" | "Stable" | "Volatile"
  critical_alerts: number
  total_news_filtered: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
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
  time_window?: TimeWindow
  time_window_description?: string
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
    affected_countries: string[]
    affected_markets: string[]
  }>
  count: number
  generated_at: string
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
  async getDashboardData(timeWindow?: TimeWindow, dateRange?: DateRange): Promise<DashboardData> {
    const params: Record<string, any> = {}
    
    if (timeWindow) {
      params.time_window = timeWindow
    }
    
    if (timeWindow === "custom" && dateRange) {
      if (dateRange.from) {
        params.from_date = dateRange.from.toISOString().split('T')[0]
      }
      if (dateRange.to) {
        params.to_date = dateRange.to.toISOString().split('T')[0]
      }
    }
    
    return this.get<DashboardData>("/api/risk/dashboard", Object.keys(params).length > 0 ? params : undefined)
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

  async getNewsFeed(limit = 20, timeWindow?: TimeWindow, dateRange?: DateRange, offset = 0): Promise<{ articles: NewsArticle[]; count: number; generated_at: string }> {
    const params: Record<string, any> = { limit, offset }
    
    if (timeWindow) {
      params.time_window = timeWindow
    }
    
    if (timeWindow === "custom" && dateRange) {
      if (dateRange.from) {
        params.from_date = dateRange.from.toISOString().split('T')[0]
      }
      if (dateRange.to) {
        params.to_date = dateRange.to.toISOString().split('T')[0]
      }
    }
    
    return this.get("/api/news/feed", params)
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
    daysBack: number = 30,
    forceRegenerate: boolean = true
  ): Promise<StorylineResponse> {
    return this.post<StorylineResponse>(`/api/themes/${themeId}/storyline?max_articles=${maxArticles}&days_back=${daysBack}&force_regenerate=${forceRegenerate}`, {})
  }

  async downloadStorylineReport(themeId: string) {
    const url = `${this.baseUrl}/api/themes/${themeId}/storyline/download`
    
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

      // Get HTML content
      const htmlContent = await response.text()
      
      // Convert HTML to PDF using jsPDF and html2canvas
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      
      // Create a temporary container for the HTML content
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = htmlContent
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.width = '210mm' // A4 width
      tempContainer.style.padding = '20mm'
      tempContainer.style.fontFamily = 'Arial, sans-serif'
      tempContainer.style.backgroundColor = 'white'
      document.body.appendChild(tempContainer)

      // Wait a bit for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100))

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        useCORS: true,
        allowTaint: true,
        background: '#ffffff'
      })

      // Remove temp container
      document.body.removeChild(tempContainer)

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm  
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Download PDF
      const filename = `risk_impact_assessment_${themeId}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
      
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
