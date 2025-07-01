"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, BarChart3, FileText, Sparkles, Clock, Download, Eye, Globe, TrendingUp, Target } from "lucide-react"
import { apiClient, ThemeStatistics, ThemeStatisticsResponse, ThemeArticlesResponse, StorylineResponse, RecentStorylinesResponse } from "@/lib/api-client"
import { formatRelativeTime } from "@/lib/time-utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ThemeAnalyticsProps {
  className?: string
}

export function ThemeAnalytics({ className }: ThemeAnalyticsProps) {
  const [themeStats, setThemeStats] = useState<ThemeStatistics[]>([])
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [themeArticles, setThemeArticles] = useState<ThemeArticlesResponse | null>(null)
  const [storyline, setStoryline] = useState<StorylineResponse | null>(null)
  const [existingStorylines, setExistingStorylines] = useState<RecentStorylinesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingStoryline, setGeneratingStoryline] = useState(false)
  const [showStorylineDialog, setShowStorylineDialog] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)

  // Fetch theme statistics and existing storylines on component mount
  useEffect(() => {
    fetchThemeStatistics()
    fetchExistingStorylines()
  }, [])

  const fetchExistingStorylines = async () => {
    try {
      const response = await apiClient.getRecentStorylines()
      setExistingStorylines(response)
    } catch (err) {
      console.error("Failed to fetch existing storylines:", err)
    }
  }

  const fetchThemeStatistics = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getThemeStatistics()
      const stats = response.themes || []
      setThemeStats(stats.sort((a: ThemeStatistics, b: ThemeStatistics) => b.article_count - a.article_count))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch theme statistics")
      console.error("Theme statistics error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleThemeClick = async (themeId: string) => {
    try {
      setSelectedTheme(themeId)
      setThemeArticles(null)
      setStoryline(null)
      
      const articles = await apiClient.getThemeArticles(themeId)
      setThemeArticles(articles)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch theme articles")
      console.error("Theme articles error:", err)
    }
  }

  const handleGenerateStoryline = async (themeId: string) => {
    // First check if we already have a storyline for this theme
    const existingStoryline = existingStorylines?.storylines.find(s => s.theme_id === themeId)
    
    if (existingStoryline) {
      // Use existing storyline - create a minimal StorylineResponse
      const fullStoryline: StorylineResponse = {
        theme_id: existingStoryline.theme_id,
        theme_name: existingStoryline.theme_name,
        storyline: existingStoryline.storyline,
        context: {
          theme_name: existingStoryline.theme_name,
          article_count: existingStoryline.article_count,
          total_exposure: 0, // Default values for cached storylines
          date_range: { start: "", end: "" },
          geographic_scope: {
            countries: [],
            country_count: 0,
            cross_country_events: {}
          },
          market_scope: {
            markets: [],
            market_count: 0,
            cross_market_events: {}
          },
          severity_distribution: { Critical: 0, High: 0, Medium: 0, Low: 0 },
          avg_risk_score: 0,
          max_risk_score: 0
        },
        report_data: {
          report_metadata: {
            title: `Impact Assessment Report: ${existingStoryline.theme_name}`,
            generated_at: existingStoryline.generated_at,
            report_id: `IAR-${themeId.toUpperCase()}-${new Date().toISOString().split('T')[0]}`,
            analyst: "AI Risk Analytics System",
            classification: "CONFIDENTIAL - INTERNAL USE ONLY"
          },
          executive_summary: {
            theme: existingStoryline.theme_name,
            article_count: existingStoryline.article_count,
            date_range: { start: "", end: "" },
            total_exposure: 0,
            severity_distribution: { Critical: 0, High: 0, Medium: 0, Low: 0 },
            geographic_scope: 0,
            market_scope: 0,
            avg_risk_score: 0,
            max_risk_score: 0
          },
          storyline_content: existingStoryline.storyline,
          supporting_data: {
            key_countries: [],
            key_markets: [],
            cross_linkages: { countries: {}, markets: {} },
            timeline: []
          },
          article_references: [],
          risk_metrics: {
            total_articles_analyzed: existingStoryline.article_count,
            critical_articles: 0,
            high_risk_articles: 0,
            total_financial_exposure: 0,
            avg_risk_score: 0,
            risk_distribution: { Critical: 0, High: 0, Medium: 0, Low: 0 }
          }
        },
        metadata: {
          articles_analyzed: existingStoryline.article_count,
          articles_selected: existingStoryline.article_count,
          total_exposure: 0,
          affected_countries: [],
          affected_markets: [],
          severity_distribution: { Critical: 0, High: 0, Medium: 0, Low: 0 },
          avg_risk_score: 0,
          generation_date: existingStoryline.generated_at
        }
      }
      
      setStoryline(fullStoryline)
      setShowStorylineDialog(true)
      return
    }

    // Generate new storyline if none exists
    try {
      setGeneratingStoryline(true)
      const response = await apiClient.generateThemeStoryline(themeId)
      setStoryline(response)
      setShowStorylineDialog(true)
      // Refresh existing storylines
      await fetchExistingStorylines()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate impact assessment")
      console.error("Impact assessment generation error:", err)
    } finally {
      setGeneratingStoryline(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!storyline) return
    
    try {
      setDownloadingReport(true)
      await apiClient.downloadStorylineReport(storyline.theme_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download report")
      console.error("Download error:", err)
    } finally {
      setDownloadingReport(false)
    }
  }

  const getRiskScoreColor = (score: number): string => {
    if (score >= 9.0) return "bg-red-600 text-white"
    if (score >= 7.0) return "bg-orange-500 text-white"
    if (score >= 5.0) return "bg-yellow-500 text-white"
    if (score >= 3.0) return "bg-green-500 text-white"
    return "bg-gray-500 text-white"
  }

  const getThemeColor = (index: number): string => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", 
      "bg-red-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
      "bg-yellow-500", "bg-gray-500", "bg-cyan-500", "bg-lime-500"
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Risk Themes Analytics
            </CardTitle>
            <CardDescription>Loading theme statistics...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading theme analytics: {error}
            <Button onClick={fetchThemeStatistics} variant="outline" size="sm" className="mt-2 ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Theme Statistics Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Risk Themes Distribution
          </CardTitle>
          <CardDescription>
            Click on a theme to view articles and generate impact assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {themeStats.length > 0 ? (
              themeStats.map((theme, index) => (
                <div key={theme.theme_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {theme.theme_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskScoreColor(theme.avg_risk_score)}>
                        Avg Risk: {theme.avg_risk_score.toFixed(1)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {theme.article_count} articles
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getThemeColor(index)} cursor-pointer transition-all hover:opacity-80`}
                        style={{
                          width: `${Math.max(5, (theme.article_count / Math.max(...themeStats.map(t => t.article_count))) * 100)}%`
                        }}
                        onClick={() => handleGenerateStoryline(theme.theme_id)}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No theme data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Theme Articles */}
      {selectedTheme && themeArticles && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {themeArticles.theme_name} Articles
                </CardTitle>
                <CardDescription>
                  {themeArticles.total_count} articles in this theme
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {storyline && storyline.theme_id === selectedTheme ? (
                  <Button 
                    onClick={() => setShowStorylineDialog(true)}
                    variant="default"
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Storyline
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleGenerateStoryline(selectedTheme)}
                    disabled={generatingStoryline}
                    className="gap-2"
                  >
                    {generatingStoryline ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {existingStorylines?.storylines.find(s => s.theme_id === selectedTheme) 
                          ? "View Impact Assessment" 
                          : "Generate Impact Assessment"
                        }
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {themeArticles.articles.map((article) => (
                <div key={article.id} className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">{article.headline}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {article.source_name} • {new Date(article.published_date).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Badge className={getRiskScoreColor(article.overall_risk_score)}>
                      Risk: {article.overall_risk_score.toFixed(1)}
                    </Badge>
                    <Badge variant="outline">
                      {article.primary_risk_category.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Impact Assessment Modal */}
      <Dialog open={showStorylineDialog} onOpenChange={setShowStorylineDialog}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Banking Risk Impact Assessment: {storyline?.theme_name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              <span>Based on {storyline?.context.article_count} articles</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Generated {storyline ? new Date(storyline.report_data.report_metadata.generated_at).toLocaleString() : ''}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          {storyline && (
            <div className="flex-1 p-6 pt-0 space-y-4 overflow-hidden">
              {/* Context Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                    <Globe className="h-3 w-3" />
                    Countries
                  </div>
                  <div className="font-semibold">{storyline.context.geographic_scope.country_count}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-3 w-3" />
                    Markets
                  </div>
                  <div className="font-semibold">{storyline.context.market_scope.market_count}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                    <Target className="h-3 w-3" />
                    Risk Score
                  </div>
                  <div className="font-semibold">{storyline.context.avg_risk_score.toFixed(1)}</div>
                </div>
              </div>

              {/* Download Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleDownloadReport()} 
                  disabled={downloadingReport}
                  className="flex items-center gap-2"
                >
                  {downloadingReport ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF Report
                </Button>
              </div>

              <Separator />
              
              {/* Impact Assessment Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(95vh-320px)] w-full rounded-md border">
                  <div className="p-6">
                    <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-foreground">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-foreground">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-foreground">{children}</h3>,
                          p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-foreground">{children}</p>,
                          ul: ({ children }) => <ul className="mb-3 pl-4 text-sm text-foreground">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-3 pl-4 text-sm text-foreground">{children}</ol>,
                          li: ({ children }) => <li className="mb-1 text-foreground">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                        }}
                      >
                        {storyline.storyline}
                      </ReactMarkdown>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Supporting Data */}
              {(storyline.context.geographic_scope.countries.length > 0 || storyline.context.market_scope.markets.length > 0) && (
                <div className="space-y-4 border-t pt-4">
                  {storyline.context.geographic_scope.countries.length > 0 && (
                    <>
                      <h4 className="font-semibold text-sm">Geographic Scope</h4>
                      <div className="flex flex-wrap gap-2">
                        {storyline.context.geographic_scope.countries.map((country) => (
                          <Badge key={country} variant="outline">
                            {country}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  {storyline.context.market_scope.markets.length > 0 && (
                    <>
                      <h4 className="font-semibold text-sm">Market Scope</h4>
                      <div className="flex flex-wrap gap-2">
                        {storyline.context.market_scope.markets.map((market) => (
                          <Badge key={market} variant="outline">
                            {market}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  <h4 className="font-semibold text-sm">Severity Distribution</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(storyline.context.severity_distribution).map(([severity, count]) => (
                      <div key={severity} className="text-center p-2 border rounded">
                        <div className="font-semibold text-sm">{count}</div>
                        <div className="text-xs text-muted-foreground">{severity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
