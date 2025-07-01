"use client"

import {
  Bell,
  CalendarDays,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RiskBreakdownPieChart } from "@/components/charts/risk-breakdown-pie-chart"
import { QuickFilters } from "@/components/dashboard/quick-filters"
import { AdvancedFilters } from "@/components/dashboard/advanced-filters"
import { ThemeAnalytics } from "@/components/dashboard/theme-analytics"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { useDashboardSSE } from "@/hooks/use-dashboard-sse"
import { apiClient } from "@/lib/api-client"
import type { DashboardData, NewsArticle } from "@/lib/api-client"
import { formatRelativeTime } from "@/lib/time-utils"
import { RiskFilters, DEFAULT_FILTERS, applyFilters } from "@/lib/filters"
import React, { useEffect, useState, useMemo } from "react"

export default function RiskDashboardContent() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [initialData, setInitialData] = useState<DashboardData | null>(null)
  const [newsData, setNewsData] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<RiskFilters>(DEFAULT_FILTERS)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { isMobile } = useSidebar()

  // Use SSE for real-time updates
  const { data: sseData, status: sseStatus } = useDashboardSSE()

  // Fetch initial dashboard data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        console.log("Starting API calls...")
        
        const dashboardPromise = apiClient.getDashboardData()
        const newsPromise = apiClient.getNewsFeed(10)
        
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
  }, [])

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      const [dashboardData, newsResponse] = await Promise.all([
        apiClient.getDashboardData(),
        apiClient.getNewsFeed(10)
      ])
      setInitialData(dashboardData)
      setNewsData(newsResponse.articles)
      setError(null)
      console.log("Data refreshed manually")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh data")
      console.error("Manual refresh error:", err)
    }
  }

  // Merge initial data with SSE updates
  const dashboardData = React.useMemo(() => {
    if (!initialData) return null

    return {
      dashboard_summary: sseData.dashboardSummary || initialData.dashboard_summary,
      sentiment_analysis: sseData.sentimentAnalysis || initialData.sentiment_analysis,
      trending_topics: sseData.trendingTopics.length > 0 ? sseData.trendingTopics : initialData.trending_topics,
      risk_breakdown: sseData.riskBreakdown.length > 0 ? sseData.riskBreakdown : initialData.risk_breakdown,
      geographic_risk: sseData.geographicRisk.length > 0 ? sseData.geographicRisk : initialData.geographic_risk,
      news_feed: sseData.newsArticles.length > 0 ? sseData.newsArticles : newsData,
    }
  }, [initialData, sseData, newsData])

  // Apply filters to news data
  const filteredNewsData = useMemo(() => {
    if (!dashboardData?.news_feed) return []
    return applyFilters(dashboardData.news_feed, filters)
  }, [dashboardData?.news_feed, filters])

  // Extract available filter options from data
  const availableCountries = useMemo(() => {
    if (!dashboardData?.news_feed) return []
    const countries = new Set<string>()
    dashboardData.news_feed.forEach(article => {
      article.countries?.forEach(country => countries.add(country))
    })
    return Array.from(countries).sort()
  }, [dashboardData?.news_feed])

  const availableRiskCategories = useMemo(() => {
    if (!dashboardData?.news_feed) return []
    const categories = new Set<string>()
    dashboardData.news_feed.forEach(article => {
      if (article.primary_risk_category) {
        categories.add(article.primary_risk_category)
      }
    })
    return Array.from(categories).sort()
  }, [dashboardData?.news_feed])

  const availableSources = useMemo(() => {
    if (!dashboardData?.news_feed) return []
    const sources = new Set<string>()
    dashboardData.news_feed.forEach(article => {
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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[240px] justify-start text-left font-normal bg-background text-foreground"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {date ? date.toLocaleDateString() : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" className="bg-background text-foreground">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
          <Button variant="default" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-auto">
        {/* Show SSE error if any */}
        {sseStatus.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-red-800">Real-time updates unavailable: {sseStatus.error}</span>
            </div>
          </div>
        )}

        {/* Full Screen Layout: News Feed Left, Charts Middle, Theme Analytics Right */}
        <div className="grid gap-4 lg:grid-cols-3 h-[calc(100vh-180px)]">
          {/* Left Third - Live News Feed */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Live News Feed</CardTitle>
                  <CardDescription>Real-time news impacting financial risk.</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="gap-1.5 text-sm bg-background text-foreground"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </Button>
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
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {filteredNewsData && filteredNewsData.length > 0 ? (
                  filteredNewsData.map((item: NewsArticle) => (
                    <div key={item.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
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
                        {item.countries.length > 0 && (
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
                          Risk Score: {item.overall_risk_score.toFixed(1)}
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
            </CardContent>
          </Card>
          
          {/* Middle Third - KPIs and Risk Breakdown */}
          <div className="flex flex-col gap-4">
            {/* KPI Cards Grid - Now 2 cards in a row for better fit */}
            <div className="grid gap-3 grid-cols-2">
              {/* Overall Risk Score */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardDescription className="text-xs">Overall Risk Score</CardDescription>
                    <Badge
                      className={`text-white text-xs ${
                        dashboardData.dashboard_summary.overall_risk_score >= 8
                          ? "bg-red-500"
                          : dashboardData.dashboard_summary.overall_risk_score >= 6
                            ? "bg-orange-500"
                            : dashboardData.dashboard_summary.overall_risk_score >= 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                      }`}
                    >
                      {dashboardData.dashboard_summary.overall_risk_score >= 8
                        ? "HIGH"
                        : dashboardData.dashboard_summary.overall_risk_score >= 6
                          ? "MEDIUM"
                          : "LOW"}
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {dashboardData.dashboard_summary.overall_risk_score.toFixed(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="text-xs text-pink-600 dark:text-pink-400 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {dashboardData.dashboard_summary.risk_trend}
                  </div>
                </CardContent>
                <CardFooter className="p-0 mt-auto">
                  <div className="w-full h-8 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-b-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-white drop-shadow-md">
                      Risk Trend <TrendingUp className="inline h-3 w-3" />
                    </span>
                  </div>
                </CardFooter>
              </Card>

              {/* Critical Alerts */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Risk Alert Summary</CardDescription>
                  <CardTitle className="text-3xl">{dashboardData.dashboard_summary.critical_alerts}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Alert breakdown with colored indicators */}
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
                      <span className="text-xs font-medium">
                        {Math.max(0, Math.floor((dashboardData.dashboard_summary.total_news_today - dashboardData.dashboard_summary.critical_count - dashboardData.dashboard_summary.high_count) * 0.7))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-muted-foreground">Low</span>
                      </div>
                      <span className="text-xs font-medium">
                        {Math.max(0, Math.floor((dashboardData.dashboard_summary.total_news_today - dashboardData.dashboard_summary.critical_count - dashboardData.dashboard_summary.high_count) * 0.3))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Breakdown Chart - Compact */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Risk Breakdown by Category</CardTitle>
                <CardDescription className="text-xs">Distribution of identified risks.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <RiskBreakdownPieChart 
                  data={dashboardData.risk_breakdown || []} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Third - Theme Analytics */}
          <div className="flex flex-col">
            <ThemeAnalytics className="flex-1" />
          </div>
        </div>
      </main>
    </>
  )
}
