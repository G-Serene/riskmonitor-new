"use client"

import {
  Clock,
  Download,
  Info,
  ListFilter,
  SearchIcon,
  TrendingUp,
  Share2,
  Star,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { InteractiveRiskBreakdown } from "@/components/charts/interactive-risk-breakdown"
import { RiskTrendsMini } from "@/components/charts/risk-trends-mini"
import { QuickFilters } from "@/components/dashboard/quick-filters"
import { AdvancedFilters } from "@/components/dashboard/advanced-filters"
import { ThemeAnalytics } from "@/components/dashboard/theme-analytics"
import { TimeWindowSelector } from "@/components/dashboard/time-window-selector"
import { CriticalAlerts } from "@/components/dashboard/critical-alerts"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { useDashboardSSE } from "@/hooks/use-dashboard-sse"
import { apiClient } from "@/lib/api-client"
import type { DashboardData, NewsArticle, TimeWindow, DateRange } from "@/lib/api-client"
import { formatRelativeTime } from "@/lib/time-utils"
import { RiskFilters, DEFAULT_FILTERS, applyFilters } from "@/lib/filters"
import { getUrgencyColor, getTemporalImpactColor } from "@/lib/risk-utils"
import React, { useEffect, useState, useMemo } from "react"

export default function RiskDashboardContent() {
  const [initialData, setInitialData] = useState<DashboardData | null>(null)
  const [newsData, setNewsData] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<RiskFilters>(DEFAULT_FILTERS)
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h")
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null)
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false)
  const { isMobile } = useSidebar()

  // Use SSE for real-time updates
  const { data: sseData, status: sseStatus } = useDashboardSSE()

  // Fetch initial dashboard data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        console.log("Starting API calls with time window:", timeWindow)
        
        const dashboardPromise = apiClient.getDashboardData(timeWindow, dateRange)
        const newsPromise = apiClient.getNewsFeed(10, timeWindow, dateRange)
        
        console.log("Fetching dashboard data from:", `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/risk/dashboard`)
        console.log("Fetching news feed from:", `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/news/feed`)
        
        const [dashboardData, newsResponse] = await Promise.all([
          dashboardPromise,
          newsPromise
        ])
        
        console.log("Dashboard data received:", dashboardData)
        console.log("News data received:", newsResponse)
        
        setInitialData(dashboardData)
        setNewsData(newsResponse.articles)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch dashboard data"
        setError(errorMessage)
        console.error("Dashboard API Error:", err)
        console.error("Error details:", {
          message: errorMessage,
          stack: err instanceof Error ? err.stack : 'No stack trace',
          cause: err instanceof Error ? err.cause : 'No cause'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [timeWindow, dateRange])

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      const [dashboardData, newsResponse] = await Promise.all([
        apiClient.getDashboardData(timeWindow, dateRange),
        apiClient.getNewsFeed(10, timeWindow, dateRange)
      ])
      setInitialData(dashboardData)
      setNewsData(newsResponse.articles)
      setError(null)
      console.log("Data refreshed manually with time window:", timeWindow)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh data")
      console.error("Manual refresh error:", err)
    }
  }

  // Merge initial data with SSE updates
  const dashboardData = React.useMemo(() => {
    if (!initialData) return null

    // Debug logging for dashboard summary
    console.log("Dashboard Summary Data:", {
      initial: initialData.dashboard_summary,
      sse: sseData.dashboardSummary,
      usingSSE: !!(sseData.dashboardSummary && Object.keys(sseData.dashboardSummary).length > 0)
    })

    // Merge news: combine initial news with SSE updates, avoiding duplicates
    let mergedNews = newsData || []
    if (sseData.newsArticles.length > 0) {
      const existingIds = new Set(mergedNews.map(article => article.id))
      const newArticles = sseData.newsArticles.filter(article => !existingIds.has(article.id))
      mergedNews = [...newArticles, ...mergedNews] // New articles first
      console.log("Merged news:", {
        initial: newsData?.length || 0,
        sseUpdates: sseData.newsArticles.length,
        newArticles: newArticles.length,
        total: mergedNews.length
      })
    }

    return {
      dashboard_summary: (sseData.dashboardSummary && Object.keys(sseData.dashboardSummary).length > 0) 
        ? sseData.dashboardSummary 
        : initialData.dashboard_summary,
      sentiment_analysis: initialData.sentiment_analysis,
      trending_topics: initialData.trending_topics,
      risk_breakdown: sseData.riskBreakdown.length > 0 ? sseData.riskBreakdown : initialData.risk_breakdown,
      geographic_risk: initialData.geographic_risk,
      news_feed: mergedNews,
      time_window: initialData.time_window,
      time_window_description: initialData.time_window_description,
      generated_at: initialData.generated_at,
      cache_timestamp: initialData.cache_timestamp,
    }
  }, [initialData, sseData, newsData])

  // Apply filters to merged news data from dashboardData
  const filteredNewsData = useMemo(() => {
    const currentNewsData = dashboardData?.news_feed || []
    if (currentNewsData.length === 0) return []
    const filtered = applyFilters(currentNewsData, filters)
    console.log("News filtering:", {
      original: currentNewsData.length,
      filtered: filtered.length,
      filters: filters
    })
    return filtered
  }, [dashboardData?.news_feed, filters])

  // Extract available filter options from merged data
  const availableCountries = useMemo(() => {
    const currentNewsData = dashboardData?.news_feed || []
    if (currentNewsData.length === 0) return []
    const countries = new Set<string>()
    currentNewsData.forEach(article => {
      article.countries?.forEach(country => countries.add(country))
    })
    return Array.from(countries).sort()
  }, [dashboardData?.news_feed])

  const availableRiskCategories = useMemo(() => {
    const currentNewsData = dashboardData?.news_feed || []
    if (currentNewsData.length === 0) return []
    const categories = new Set<string>()
    currentNewsData.forEach(article => {
      if (article.primary_risk_category) {
        categories.add(article.primary_risk_category)
      }
    })
    return Array.from(categories).sort()
  }, [dashboardData?.news_feed])

  const availableSources = useMemo(() => {
    const currentNewsData = dashboardData?.news_feed || []
    if (currentNewsData.length === 0) return []
    const sources = new Set<string>()
    currentNewsData.forEach(article => {
      if (article.source_name) {
        sources.add(article.source_name)
      }
    })
    return Array.from(sources).sort()
  }, [dashboardData?.news_feed])

  // Helper function to get risk score color
  const getRiskScoreColor = (score: number): string => {
    if (score >= 9.0) return "bg-red-600 hover:bg-red-700"
    if (score >= 7.0) return "bg-orange-500 hover:bg-orange-600"
    if (score >= 5.0) return "bg-yellow-500 hover:bg-yellow-600"
    if (score >= 3.0) return "bg-green-500 hover:bg-green-600"
    return "bg-gray-500 hover:bg-gray-600"
  }

  // Helper function to get confidence score color
  const getConfidenceColor = (score: number): string => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  // Handle opening news dialog
  const handleNewsClick = (article: NewsArticle) => {
    setSelectedNews(article)
    setIsNewsDialogOpen(true)
  }

  // Helper function to get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return "bg-green-500"
      case "negative":
        return "bg-red-500"
      default:
        return "bg-orange-500"
    }
  }

  // Helper function to get sentiment score color
  const getSentimentScoreColor = (score: number): string => {
    if (score > 0.5) return "bg-green-100 text-green-800 border-green-200"
    if (score > -0.5) return "bg-gray-100 text-gray-800 border-gray-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  // We can also add a function to format dates consistently if needed

  // Helper function to get severity badge color
  const getSeverityBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
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

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else {
      return `$${amount.toLocaleString()}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard: {error}
            <Button onClick={() => window.location.reload()} className="mt-4 w-full">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboardData) return null

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4 flex-shrink-0">
        {isMobile && <SidebarTrigger className="sm:hidden" />}

        {/* SSE Connection Status */}
        <div className="flex items-center gap-2">
          {sseStatus.isConnected ? (
            <div className="flex items-center gap-1 text-green-600">
              <Wifi className="h-4 w-4" />
              <span className="text-xs">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-xs">Offline</span>
            </div>
          )}
          {sseStatus.lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(sseStatus.lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="relative flex-1 md:grow-0">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search risks, news, countries..."
            className="w-full rounded-lg bg-background pl-8 md:w-[280px] lg:w-[320px]"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <TimeWindowSelector 
            value={timeWindow} 
            onChange={setTimeWindow}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="hidden sm:flex"
          />
          <CriticalAlerts
            newsData={dashboardData?.news_feed || []}
            sseConnected={sseStatus.isConnected}
            overallRiskScore={dashboardData?.dashboard_summary.overall_risk_score || 0}
          />
          <Button variant="default" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-hidden flex flex-col min-h-0">
        {/* Mobile Time Window Selector */}
        <div className="mb-4 sm:hidden flex-shrink-0">
          <TimeWindowSelector 
            value={timeWindow} 
            onChange={setTimeWindow}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="w-full"
          />
        </div>

        {/* Show SSE error if any */}
        {sseStatus.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-red-800">Real-time updates unavailable: {sseStatus.error}</span>
            </div>
          </div>
        )}

        {/* Dashboard Time Window Summary */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Dashboard metrics filtered by: {dashboardData.time_window_description || "last 24 hours"}
              </span>
            </div>
            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-100">
              {dashboardData.dashboard_summary.total_news_today} articles
            </Badge>
          </div>
        </div>

        {/* Full Screen Layout: News Feed Left, Charts Middle, Theme Analytics Right */}
        <div className="grid gap-4 lg:grid-cols-3 flex-1 min-h-0">
          {/* Left Third - Live News Feed */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Live News Feed</CardTitle>
                  <CardDescription>Real-time news impacting financial risk.</CardDescription>
                </div>
                <div className="relative w-full max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search headlines, content, keywords..."
                    className="pl-10 h-9 text-sm border-border bg-background"
                    value={filters.searchKeywords}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchKeywords: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* News Feed Filters - All in one line */}
              <div className="mt-4 pt-4 border-t">
                <QuickFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onOpenAdvanced={() => setShowAdvancedFilters(true)}
                  articleCount={filteredNewsData.length}
                />
              </div>
            </CardHeader>

            {/* Advanced Filters Panel */}
            <AdvancedFilters
              isOpen={showAdvancedFilters}
              onOpenChange={setShowAdvancedFilters}
              filters={filters}
              onFiltersChange={setFilters}
              availableCountries={availableCountries}
              availableRiskCategories={availableRiskCategories}
              availableSources={availableSources}
            />
            <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
              <div className="news-feed-scroll px-6 pb-6">
                <div className="space-y-4">
                {filteredNewsData && filteredNewsData.length > 0 ? (
                  filteredNewsData.map((item: NewsArticle) => (
                    <div 
                      key={item.id} 
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => handleNewsClick(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-md flex-1 pr-2">{item.headline}</h3>
                        <Badge className={`${getSeverityBadgeColor(item.severity_level)} text-white flex-shrink-0`}>
                          {item.severity_level} Risk
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.source_name}
                        {item.minutes_ago !== undefined && (
                          <span className="ml-2 text-blue-600 font-medium">
                            • {formatRelativeTime(item.minutes_ago)}
                          </span>
                        )}
                        {item.countries && item.countries.length > 0 && (
                          <span className="ml-2">• {item.countries.join(", ")}</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {item.summary.substring(0, 150)}
                        {item.summary.length > 150 ? "..." : ""}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Risk Score with color coding */}
                        <Badge 
                          className={`${getRiskScoreColor(item.overall_risk_score)} text-white border-0`}
                        >
                          Risk Assessment: {item.overall_risk_score.toFixed(1)}
                        </Badge>

                        {/* Sentiment Score */}
                        <Badge 
                          variant="outline" 
                          className={getSentimentScoreColor(item.sentiment_score)}
                        >
                          Sentiment: {item.sentiment_score > 0 ? '+' : ''}{item.sentiment_score.toFixed(2)}
                        </Badge>
                        
                        {/* Confidence Score */}
                        {item.confidence_score && (
                          <Badge 
                            variant="outline" 
                            className={getConfidenceColor(item.confidence_score)}
                          >
                            Confidence: {item.confidence_score.toFixed(0)}%
                          </Badge>
                        )}
                        
                        {/* Impact Score */}
                        {item.impact_score && (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                            Impact: {item.impact_score.toFixed(1)}
                          </Badge>
                        )}
                        
                        {/* Risk Category */}
                        <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-800">
                          {item.primary_risk_category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>

                        {/* Theme Display */}
                        {item.theme_display_name && (
                          <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
                            🎯 {item.theme_display_name}
                          </Badge>
                        )}
                        
                        {/* Industry Sectors */}
                        {item.industry_sectors && (() => {
                          try {
                            // Handle both string (JSON) and array formats
                            let sectors = item.industry_sectors
                            if (typeof sectors === 'string') {
                              sectors = JSON.parse(sectors)
                            }
                            
                            if (Array.isArray(sectors) && sectors.length > 0) {
                              return sectors.slice(0, 2).map((sector: string, index: number) => (
                                <Badge 
                                  key={`${item.id}-industry-${index}`}
                                  variant="outline" 
                                  className="border-indigo-200 bg-indigo-50 text-indigo-800 cursor-pointer hover:bg-indigo-100 transition-colors"
                                  onClick={() => {
                                    // Add sector to industry filter
                                    if (!filters.industrySectors.includes(sector)) {
                                      setFilters(prev => ({
                                        ...prev,
                                        industrySectors: [...prev.industrySectors, sector]
                                      }))
                                    }
                                  }}
                                >
                                  🏭 {sector.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              ))
                            }
                          } catch (e) {
                            // Silently ignore parsing errors
                          }
                          return null
                        })()}
                        
                        {/* Financial exposure display removed as requested */}
                        
                        {/* Breaking News */}
                        {item.is_breaking_news && (
                          <Badge className="bg-red-600 text-white animate-pulse">
                            🚨 BREAKING
                          </Badge>
                        )}
                        
                        {/* Trending */}
                        {item.is_trending && (
                          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-800">
                            📈 Trending
                          </Badge>
                        )}
                        
                        {/* Market Moving */}
                        {item.is_market_moving && (
                          <Badge className="bg-blue-600 text-white">
                            📊 Market Moving
                          </Badge>
                        )}
                        
                        {/* Requires Action */}
                        {item.requires_action && (
                          <Badge className="bg-yellow-600 text-white">
                            ⚠️ Action Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Details</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Star className="h-4 w-4" />
                            <span className="sr-only">Watchlist</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Share2 className="h-4 w-4" />
                            <span className="sr-only">Share</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No recent news articles available.</p>
                    <p className="text-sm">New articles will appear here automatically.</p>
                  </div>
                )}
              </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Middle Third - KPIs and Risk Breakdown */}
          <div className="flex flex-col gap-4 h-full min-h-0">
            {/* KPI Cards Grid - 2 cards in a row */}
            <div className="grid gap-3 grid-cols-2">
              {/* Overall Risk Score - Enhanced Banking View */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Overall Risk Score</CardTitle>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="inline-flex items-center justify-center h-6 w-6 rounded-full hover:bg-gray-100 transition-colors">
                            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 z-[100]" align="start" side="bottom">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Risk Score Calculation</h4>
                            
                            <div className="text-xs space-y-3">
                              <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                                <div className="font-semibold mb-2">Formula:</div>
                                <div>Score = Σ(SeverityWeight × Confidence × Impact × TimeDecay) / TotalWeight × 2.5</div>
                                <div className="mt-2 text-gray-600">
                                  + SentimentAdjustment + ExposureAdjustment
                                </div>
                              </div>
                              
                              <div>
                                <div className="font-semibold mb-1">Weights:</div>
                                <div className="text-gray-600">Critical: 4, High: 3, Medium: 2, Low: 1</div>
                              </div>
                              
                              <div className="bg-blue-50 p-3 rounded border">
                                <div className="font-semibold mb-2">Example Calculation:</div>
                                <div className="space-y-1">
                                  <div>Article 1: 2 × 0.70 × 0.60 × 1.0 = 0.84</div>
                                  <div>Article 2: 2 × 0.75 × 0.65 × 1.0 = 0.98</div>
                                  <div className="border-t pt-1 mt-2">
                                    <div>Base: (0.84 + 0.98) / 2 × 2.5 = 2.28</div>
                                    <div>+ Sentiment: +0.3</div>
                                    <div>+ Exposure: +0.2</div>
                                    <div className="font-semibold text-blue-600">= {dashboardData.dashboard_summary.overall_risk_score?.toFixed(1) || "2.8"}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Badge
                      className={`text-white text-xs ${
                        (dashboardData.dashboard_summary.overall_risk_score || 0) >= 8
                          ? "bg-red-500"
                          : (dashboardData.dashboard_summary.overall_risk_score || 0) >= 6
                            ? "bg-orange-500"
                            : (dashboardData.dashboard_summary.overall_risk_score || 0) >= 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                      }`}
                    >
                      {(dashboardData.dashboard_summary.overall_risk_score || 0) >= 8
                        ? "CRITICAL"
                        : (dashboardData.dashboard_summary.overall_risk_score || 0) >= 6
                          ? "HIGH"
                          : (dashboardData.dashboard_summary.overall_risk_score || 0) >= 4
                            ? "MEDIUM"
                            : "LOW"}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <CardTitle className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                      {dashboardData.dashboard_summary.overall_risk_score?.toFixed(1) || "0.0"}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className={`w-4 h-4 ${
                        dashboardData.dashboard_summary.risk_trend === 'Rising' ? 'text-red-500' :
                        dashboardData.dashboard_summary.risk_trend === 'Falling' ? 'text-green-500 rotate-180' :
                        'text-gray-500'
                      }`} />
                      <span className="text-xs text-muted-foreground">
                        {dashboardData.dashboard_summary.risk_trend || 'Stable'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    System risk calculation • Updated {formatRelativeTime(0)}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Articles analyzed:</span>
                        <span className="font-medium">{dashboardData.dashboard_summary.total_news_today}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max individual risk:</span>
                        <span className="font-medium">{dashboardData.dashboard_summary.current_risk_score?.toFixed(1) || "0.0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time window:</span>
                        <span className="font-medium">{dashboardData.time_window_description || "24h"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-0 mt-auto">
                  <div className="w-full h-6 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-b-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-white drop-shadow-md">
                      Risk Scale: 0-10
                    </span>
                  </div>
                </CardFooter>
              </Card>

              {/* Article Risk Assessments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Article Risk Assessments
                  </CardTitle>
                  <CardDescription className="text-xs">
                    LLM-based content analysis ({dashboardData.time_window_description || "last 24 hours"})
                  </CardDescription>
                  <div className="flex items-baseline gap-2">
                    <CardTitle className="text-3xl">{filteredNewsData.length}</CardTitle>
                    <span className="text-xs text-muted-foreground">articles</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Article assessment stats */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Highest assessment:</span>
                      <span className="text-xs font-medium text-red-600">
                        {Math.max(...filteredNewsData.map(a => a.overall_risk_score), 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Average assessment:</span>
                      <span className="text-xs font-medium">
                        {filteredNewsData.length > 0 
                          ? (filteredNewsData.reduce((sum, a) => sum + a.overall_risk_score, 0) / filteredNewsData.length).toFixed(1)
                          : "0.0"
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">System risk score:</span>
                      <span className="text-xs font-medium text-blue-600">
                        {dashboardData.dashboard_summary.overall_risk_score?.toFixed(1) || "0.0"}
                      </span>
                    </div>
                    
                    {/* Severity breakdown */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-xs text-muted-foreground">Critical</span>
                        </div>
                        <span className="text-xs font-medium">{dashboardData.dashboard_summary.critical_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span className="text-xs text-muted-foreground">High</span>
                        </div>
                        <span className="text-xs font-medium">{dashboardData.dashboard_summary.high_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span className="text-xs text-muted-foreground">Medium</span>
                        </div>
                        <span className="text-xs font-medium">{dashboardData.dashboard_summary.medium_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-muted-foreground">Low</span>
                        </div>
                        <span className="text-xs font-medium">{dashboardData.dashboard_summary.low_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interactive Risk Breakdown */}
            <div className="h-80">
              <InteractiveRiskBreakdown 
                newsData={filteredNewsData}
                timeWindowDescription={dashboardData.time_window_description}
              />
            </div>

            {/* Risk Trends Mini Chart */}
            <div className="h-56">
              <RiskTrendsMini 
                newsData={filteredNewsData}
                timeWindowDescription={dashboardData.time_window_description}
                currentRiskScore={dashboardData.dashboard_summary.overall_risk_score || 0}
              />
            </div>
          </div>

          {/* Right Third - Theme Analytics */}
          <div className="flex flex-col h-full min-h-0">
            <ThemeAnalytics className="flex-1 h-full" />
          </div>
        </div>
      </main>

      {/* News Details Dialog */}
      <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold pr-6">
              {selectedNews?.headline}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{selectedNews?.source_name}</span>
                  {selectedNews?.minutes_ago !== undefined && (
                    <span className="text-blue-600 font-medium">
                      • {formatRelativeTime(selectedNews.minutes_ago)}
                    </span>
                  )}
                  {selectedNews?.countries && selectedNews.countries.length > 0 && (
                    <span>• {selectedNews.countries.join(", ")}</span>
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {selectedNews && (
            <div className="mt-6 space-y-6">
              {/* Content - Full article or summary */}
              <div>
                <h4 className="font-medium mb-2">
                  {selectedNews.content ? "Full Article" : "Summary"}
                </h4>
                <div className="text-sm text-muted-foreground leading-relaxed max-h-96 overflow-y-auto">
                  {selectedNews.content ? (
                    <div className="whitespace-pre-wrap">
                      {selectedNews.content}
                    </div>
                  ) : (
                    <p>{selectedNews.summary}</p>
                  )}
                </div>
                {selectedNews.source_url && (
                  <div className="mt-3">
                    <a 
                      href={selectedNews.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Read original article →
                    </a>
                  </div>
                )}
              </div>

              {/* Historical Impact Analysis */}
              {selectedNews.historical_impact_analysis && (
                <div>
                  <h4 className="font-medium mb-2">📊 Historical Impact on International Banks</h4>
                  <div className="text-sm text-muted-foreground leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="whitespace-pre-wrap">
                      {selectedNews.historical_impact_analysis}
                    </div>
                  </div>
                </div>
              )}

              {/* All Pills/Badges */}
              <div>
                <h4 className="font-medium mb-3">Risk Metrics & Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {/* Severity Level */}
                  <Badge className={`${getSeverityBadgeColor(selectedNews.severity_level)} text-white`}>
                    {selectedNews.severity_level} Risk
                  </Badge>

                  {/* Risk Score */}
                  <Badge className={`${getRiskScoreColor(selectedNews.overall_risk_score)} text-white border-0`}>
                    Risk Assessment: {selectedNews.overall_risk_score.toFixed(1)}
                  </Badge>

                  {/* Sentiment Score */}
                  <Badge variant="outline" className={getSentimentScoreColor(selectedNews.sentiment_score)}>
                    Sentiment: {selectedNews.sentiment_score > 0 ? '+' : ''}{selectedNews.sentiment_score.toFixed(2)}
                  </Badge>
                  
                  {/* Confidence Score */}
                  {selectedNews.confidence_score && (
                    <Badge variant="outline" className={getConfidenceColor(selectedNews.confidence_score)}>
                      Confidence: {selectedNews.confidence_score.toFixed(0)}%
                    </Badge>
                  )}
                  
                  {/* Impact Score */}
                  {selectedNews.impact_score && (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                      Impact: {selectedNews.impact_score.toFixed(1)}
                    </Badge>
                  )}
                  
                  {/* Risk Category */}
                  <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-800">
                    {selectedNews.primary_risk_category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>

                  {/* Theme Display */}
                  {selectedNews.theme_display_name && (
                    <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
                      🎯 {selectedNews.theme_display_name}
                    </Badge>
                  )}

                  {/* Special Flags */}
                  {selectedNews.is_breaking_news && (
                    <Badge className="bg-red-600 text-white">
                      🚨 Breaking News
                    </Badge>
                  )}
                  
                  {selectedNews.is_trending && (
                    <Badge className="bg-orange-500 text-white">
                      📈 Trending
                    </Badge>
                  )}
                  
                  {selectedNews.is_market_moving && (
                    <Badge className="bg-green-600 text-white">
                      💹 Market Moving
                    </Badge>
                  )}
                  
                  {selectedNews.is_regulatory && (
                    <Badge className="bg-blue-600 text-white">
                      📋 Regulatory
                    </Badge>
                  )}
                  
                  {selectedNews.requires_action && (
                    <Badge className="bg-purple-600 text-white">
                      ⚡ Requires Action
                    </Badge>
                  )}

                  {/* Urgency Level */}
                  <Badge variant="outline" className={getUrgencyColor(selectedNews.urgency_level)}>
                    Urgency: {selectedNews.urgency_level}
                  </Badge>

                  {/* Temporal Impact */}
                  <Badge variant="outline" className={getTemporalImpactColor(selectedNews.temporal_impact)}>
                    Impact: {selectedNews.temporal_impact}
                  </Badge>
                </div>
              </div>

              {/* Keywords */}
              {selectedNews.keywords && selectedNews.keywords.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNews.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Entities */}
              {selectedNews.entities && selectedNews.entities.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Entities</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNews.entities.map((entity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {entity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
