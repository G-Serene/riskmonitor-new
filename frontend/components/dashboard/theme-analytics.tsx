"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, BarChart3, FileText, Sparkles, Clock, Download, Eye, Globe, TrendingUp, Target, DollarSign, Truck, CreditCard, Building, LineChart, Settings, Shield, Zap, Package, AlertTriangle, TrendingDown, Droplets, Landmark, TreePine } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiClient, ThemeStatistics, ThemeStatisticsResponse, ThemeArticlesResponse, StorylineResponse, RecentStorylinesResponse } from "@/lib/api-client"
import { formatRelativeTime } from "@/lib/time-utils"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ThemeAnalyticsProps {
  className?: string
  refreshKey?: number
}

export function ThemeAnalytics({ className, refreshKey }: ThemeAnalyticsProps) {
  const [themeStats, setThemeStats] = useState<ThemeStatistics[]>([])
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [themeArticles, setThemeArticles] = useState<ThemeArticlesResponse | null>(null)
  const [storyline, setStoryline] = useState<StorylineResponse | null>(null)
  const [existingStorylines, setExistingStorylines] = useState<RecentStorylinesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingStoryline, setGeneratingStoryline] = useState(false)
  const [generatingThemeId, setGeneratingThemeId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showStorylineDialog, setShowStorylineDialog] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const { toast } = useToast()

  // Fetch theme statistics and existing storylines on component mount or when refreshKey changes
  useEffect(() => {
    fetchThemeStatistics()
    fetchExistingStorylines()
  }, [refreshKey])

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

  const handleGenerateStoryline = async (themeId: string, forceRegenerate: boolean = true) => {
    // If not forcing regeneration, check if we already have a storyline for this theme
    const existingStoryline = existingStorylines?.storylines.find(s => s.theme_id === themeId)
    
    if (!forceRegenerate && existingStoryline) {
      // Get fresh theme data to calculate risk scores for existing storyline
      let contextData = {
        total_exposure: 0,
        date_range: { start: "", end: "" },
        geographic_scope: {
          countries: existingStoryline.affected_countries || [],
          country_count: (existingStoryline.affected_countries || []).length,
          cross_country_events: {}
        },
        market_scope: {
          markets: existingStoryline.affected_markets || [],
          market_count: (existingStoryline.affected_markets || []).length,
          cross_market_events: {}
        },
        severity_distribution: { Critical: 0, High: 0, Medium: 0, Low: 0 },
        avg_risk_score: 0,
        max_risk_score: 0
      }

      // Try to get current theme articles to calculate actual risk scores
      let currentThemeArticles: any[] = []
      try {
        const themeArticlesData = await apiClient.getThemeArticles(themeId)
        currentThemeArticles = themeArticlesData.articles
        if (themeArticlesData.articles.length > 0) {
          // Calculate risk scores from current articles
          const riskScores = themeArticlesData.articles.map(a => a.overall_risk_score)
          contextData.avg_risk_score = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
          contextData.max_risk_score = Math.max(...riskScores)
          
          // Calculate severity distribution
          const severityCount = { Critical: 0, High: 0, Medium: 0, Low: 0 }
          themeArticlesData.articles.forEach(article => {
            if (severityCount.hasOwnProperty(article.severity_level)) {
              severityCount[article.severity_level]++
            }
          })
          contextData.severity_distribution = severityCount
          
          // Calculate date range
          const dates = themeArticlesData.articles.map(a => new Date(a.published_date))
          contextData.date_range = {
            start: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
            end: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0]
          }
        }
      } catch (err) {
        console.warn("Could not fetch current theme articles for risk calculation:", err)
      }

      // Use existing storyline - create a minimal StorylineResponse
      const fullStoryline: StorylineResponse = {
        theme_id: existingStoryline.theme_id,
        theme_name: existingStoryline.theme_name,
        storyline: existingStoryline.storyline,
        context: {
          theme_name: existingStoryline.theme_name,
          article_count: existingStoryline.article_count,
          ...contextData
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
          article_references: currentThemeArticles.length > 0 ? currentThemeArticles.slice(0, 10).map((article: any) => ({
            id: article.id,
            headline: article.headline,
            source: article.source_name,
            date: article.published_date,
            severity: article.severity_level,
            risk_score: article.overall_risk_score,
            countries: article.countries || [],
            financial_exposure: 0 // Default since not available in theme articles
          })) : [],
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

    // Generate new storyline
    try {
      setGeneratingStoryline(true)
      setGeneratingThemeId(themeId)
      
      // Show immediate feedback
      const themeName = themeStats.find(t => t.theme_id === themeId)?.theme_name || 'Unknown Theme'
      toast({
        title: "Generating Impact Assessment",
        description: `Creating storyline for "${themeName}". This may take 30-60 seconds...`,
      })
      
      // Simulate progress updates (since we don't have real progress from the API)
      setGenerationProgress(0)
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev // Stop at 90% until completion
          return prev + Math.random() * 15 // Random progress increments
        })
      }, 2000)
      
      const response = await apiClient.generateThemeStoryline(themeId, 50, 30, forceRegenerate)
      
      // Complete the progress
      clearInterval(progressInterval)
      setGenerationProgress(100)
      setStoryline(response)
      setShowStorylineDialog(true)
      
      // Show success notification
      toast({
        title: "Impact Assessment Complete",
        description: `Storyline for "${themeName}" has been generated successfully.`,
      })
      
      // Refresh existing storylines
      await fetchExistingStorylines()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate impact assessment"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: errorMessage,
      })
      console.error("Impact assessment generation error:", err)
    } finally {
      setGeneratingStoryline(false)
      setGeneratingThemeId(null)
      setGenerationProgress(0)
    }
  }

  const handleDownloadReport = async () => {
    if (!storyline) return
    
    try {
      setDownloadingReport(true)
      
      // Show starting toast
      toast({
        title: "Generating PDF Report",
        description: "Converting impact assessment to PDF format...",
      })
      
      const result = await apiClient.downloadStorylineReport(storyline.theme_id)
      
      // Show success toast
      toast({
        title: "PDF Download Complete",
        description: `Report saved as ${result.filename}`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to download report"
      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: errorMessage,
      })
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

  const getThemeIcon = (themeName: string) => {
    // Map actual theme names from backend to appropriate icons
    const themeIconMap: { [key: string]: any } = {
      'Credit Crisis': CreditCard,
      'Market Volatility Surge': TrendingDown,
      'Currency Crisis': DollarSign,
      'Interest Rate Shock': TrendingUp,
      'Geopolitical Crisis': AlertTriangle,
      'Trade War Escalation': Truck,
      'Regulatory Crackdown': Shield,
      'Cyber Security Breach': Zap,
      'Liquidity Shortage': Droplets,
      'Operational Disruption': Settings,
      'Real Estate Crisis': Building,
      'Inflation Crisis': TrendingUp,
      'Sovereign Debt Crisis': Landmark,
      'Supply Chain Crisis': Truck,
      'ESG & Climate Risk': TreePine,
      'Systemic Banking Crisis': AlertTriangle,
      'Other Financial Risks': AlertTriangle
    };
    
    return themeIconMap[themeName] || TrendingUp;
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
    <div className={`flex flex-col space-y-4 h-full ${className}`}>
      {/* Theme Statistics Bar Chart */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Risk Themes Distribution
          </CardTitle>
          <CardDescription>
            Last 15 days of negative news articles • Click Generate to create fresh impact assessments • View shows existing assessments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
            {themeStats.length > 0 ? (
              <TooltipProvider>
                {themeStats.map((theme, index) => {
                  const existingStoryline = existingStorylines?.storylines.find(s => s.theme_id === theme.theme_id)
                  const isGenerating = generatingStoryline && generatingThemeId === theme.theme_id
                  
                  return (
                    <div key={theme.theme_id} className="group p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-4">
                        {/* Icon and Theme Name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                            {(() => {
                              const IconComponent = getThemeIcon(theme.theme_name)
                              return <IconComponent className="h-5 w-5 text-gray-600" />
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 truncate">{theme.theme_name}</h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {existingStoryline ? (
                                <>Analysis: {formatRelativeTime(
                                  Math.floor((new Date().getTime() - new Date(existingStoryline.generated_at).getTime()) / (1000 * 60))
                                )} ago</>
                              ) : (
                                <>Analysis not generated</>
                              )}
                            </p>
                          </div>
                        </div>

                                                  {/* Clean Bar Chart with Count */}
                        <div className="flex items-center gap-4 flex-1">
                          {/* Bar Chart */}
                          <div className="flex-1 max-w-xs">
                            <div className="w-full bg-gray-100 rounded-full h-4">
                              <div
                                className={`h-4 rounded-full ${getThemeColor(index)} transition-all duration-300`}
                                style={{
                                  width: `${(theme.article_count / Math.max(...themeStats.map(t => t.article_count))) * 100}%`,
                                  minWidth: theme.article_count > 0 ? "20%" : "0%",
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Article Label */}
                          <div className="text-xs text-gray-600 font-medium min-w-fit">
                            {theme.article_count} article{theme.article_count !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-medium hover:bg-blue-50 hover:border-blue-200 bg-transparent"
                            onClick={() => {
                              setSelectedTheme(null)
                              setThemeArticles(null)
                              handleGenerateStoryline(theme.theme_id, true)
                            }}
                            disabled={generatingStoryline}
                            title="Generate fresh impact assessment"
                          >
                            {isGenerating ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                                <span>{Math.round(generationProgress)}%</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Generate IA
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-medium hover:bg-gray-50 bg-transparent"
                            onClick={() => {
                              setSelectedTheme(theme.theme_id)
                              if (existingStoryline) {
                                handleGenerateStoryline(theme.theme_id, false)
                              } else {
                                handleThemeClick(theme.theme_id)
                              }
                            }}
                            title="View existing assessment"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </TooltipProvider>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No theme data available</p>
              </div>
            )}
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
                  {themeArticles.total_count} articles in this theme (last 14 days)
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
                    Financial Markets
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
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Converting to PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download PDF Report
                    </>
                  )}
                </Button>
              </div>

              <Separator />
              
              {/* Impact Assessment Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(95vh-320px)] w-full rounded-md border">
                  <div className="p-6 space-y-6">
                    {/* Main Storyline */}
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

                    <Separator />

                    {/* Reference Articles Section */}
                    {storyline.report_data.article_references && storyline.report_data.article_references.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Reference Articles</h3>
                        <div className="grid gap-3">
                          {storyline.report_data.article_references.map((article, index) => (
                            <div key={article.id || index} className="p-4 border rounded-lg bg-muted/10">
                              <h4 className="font-medium text-sm mb-2 text-foreground">{article.headline}</h4>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                <span>{article.source}</span>
                                <span>{new Date(article.date).toLocaleDateString()}</span>
                                <Badge variant="outline" className="text-xs">
                                  {article.severity}
                                </Badge>
                                <Badge className={getRiskScoreColor(article.risk_score)}>
                                  Risk: {article.risk_score.toFixed(1)}
                                </Badge>
                              </div>
                              {article.countries && article.countries.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {article.countries.slice(0, 5).map((country) => (
                                    <Badge key={country} variant="secondary" className="text-xs">
                                      {country}
                                    </Badge>
                                  ))}
                                  {article.countries.length > 5 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{article.countries.length - 5} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Supporting Data - Now inside the scroll area */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-foreground">Supporting Data</h3>
                      
                      {/* Geographic Scope */}
                      {storyline.context.geographic_scope.countries.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-foreground">
                            Geographic Scope ({storyline.context.geographic_scope.country_count} countries)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {storyline.context.geographic_scope.countries.map((country) => (
                              <Badge key={country} variant="outline">
                                {country}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Market Scope */}
                      {storyline.context.market_scope.markets.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-foreground">
                            Financial Markets ({storyline.context.market_scope.market_count} markets)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {storyline.context.market_scope.markets.map((market) => (
                              <Badge key={market} variant="outline">
                                {market}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Severity Distribution */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground">Severity Distribution</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(storyline.context.severity_distribution).map(([severity, count]) => (
                            <div key={severity} className="text-center p-3 border rounded">
                              <div className="font-semibold text-sm">{count}</div>
                              <div className="text-xs text-muted-foreground">{severity}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
