"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { 
  Bell, 
  AlertTriangle, 
  TrendingUp, 
  Wifi, 
  WifiOff, 
  Clock,
  X,
  Shield,
  Activity
} from "lucide-react"
import { NewsArticle } from "@/lib/api-client"

interface CriticalAlert {
  id: string
  type: 'critical_risk' | 'breaking_news' | 'system_health' | 'threshold_breach'
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium'
  timestamp: Date
  source?: string
  riskScore?: number
  article?: NewsArticle
  acknowledged?: boolean
}

interface CriticalAlertsProps {
  newsData: NewsArticle[]
  sseConnected: boolean
  overallRiskScore: number
  className?: string
}

const RISK_THRESHOLD = 8.0
const CRITICAL_THRESHOLD = 9.0

export function CriticalAlerts({ 
  newsData, 
  sseConnected, 
  overallRiskScore, 
  className 
}: CriticalAlertsProps) {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date())

  // Generate alerts based on current data
  useEffect(() => {
    const newAlerts: CriticalAlert[] = []

    // 1. Critical Risk Alerts (articles with risk score > 8.0)
    const criticalRiskArticles = newsData.filter(article => 
      article.overall_risk_score >= RISK_THRESHOLD
    )
    
    criticalRiskArticles.forEach(article => {
      const severity = article.overall_risk_score >= CRITICAL_THRESHOLD ? 'critical' : 'high'
      newAlerts.push({
        id: `risk_${article.id}`,
        type: 'critical_risk',
        title: `${severity === 'critical' ? 'CRITICAL' : 'HIGH'} Risk Alert`,
        message: article.headline.substring(0, 100) + (article.headline.length > 100 ? '...' : ''),
        severity,
        timestamp: new Date(article.published_date),
        source: article.source_name,
        riskScore: article.overall_risk_score,
        article
      })
    })

    // 2. Breaking News Alerts
    const breakingNews = newsData.filter(article => 
      article.is_breaking_news && article.overall_risk_score >= 6.0
    )
    
    breakingNews.forEach(article => {
      newAlerts.push({
        id: `breaking_${article.id}`,
        type: 'breaking_news',
        title: 'Breaking News Alert',
        message: article.headline.substring(0, 100) + (article.headline.length > 100 ? '...' : ''),
        severity: article.overall_risk_score >= 8.0 ? 'critical' : 'high',
        timestamp: new Date(article.published_date),
        source: article.source_name,
        riskScore: article.overall_risk_score,
        article
      })
    })

    // 3. System Health Alerts
    if (!sseConnected) {
      newAlerts.push({
        id: 'sse_disconnected',
        type: 'system_health',
        title: 'Real-time Connection Lost',
        message: 'Live data updates are currently unavailable. Risk monitoring may be delayed.',
        severity: 'high',
        timestamp: new Date()
      })
    }

    // 4. Risk Threshold Breach
    if (overallRiskScore >= RISK_THRESHOLD) {
      const severity = overallRiskScore >= CRITICAL_THRESHOLD ? 'critical' : 'high'
      newAlerts.push({
        id: 'threshold_breach',
        type: 'threshold_breach',
        title: `${severity === 'critical' ? 'CRITICAL' : 'HIGH'} Risk Threshold Breach`,
        message: `Overall portfolio risk score (${overallRiskScore.toFixed(1)}) exceeds ${severity} threshold.`,
        severity,
        timestamp: new Date(),
        riskScore: overallRiskScore
      })
    }

    // Sort by severity and timestamp
    newAlerts.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity]
      }
      return b.timestamp.getTime() - a.timestamp.getTime()
    })

    setAlerts(newAlerts)
    setLastCheckTime(new Date())
  }, [newsData, sseConnected, overallRiskScore])

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ))
  }

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)
  const criticalCount = unacknowledgedAlerts.filter(alert => alert.severity === 'critical').length
  const highCount = unacknowledgedAlerts.filter(alert => alert.severity === 'high').length
  const totalUnacknowledged = unacknowledgedAlerts.length

  const getAlertIcon = (type: CriticalAlert['type']) => {
    switch (type) {
      case 'critical_risk':
        return <AlertTriangle className="h-4 w-4" />
      case 'breaking_news':
        return <TrendingUp className="h-4 w-4" />
      case 'system_health':
        return sseConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />
      case 'threshold_breach':
        return <Shield className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: CriticalAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white border-red-700'
      case 'high':
        return 'bg-orange-500 text-white border-orange-600'
      case 'medium':
        return 'bg-yellow-500 text-white border-yellow-600'
      default:
        return 'bg-gray-500 text-white border-gray-600'
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={`relative bg-background text-foreground ${className}`}
        >
          <Bell className="h-4 w-4" />
          {totalUnacknowledged > 0 && (
            <Badge 
              className={`absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs ${
                criticalCount > 0 
                  ? 'bg-red-600 text-white' 
                  : 'bg-orange-500 text-white'
              }`}
            >
              {totalUnacknowledged > 99 ? '99+' : totalUnacknowledged}
            </Badge>
          )}
          <span className="sr-only">Critical Alerts</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Critical Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Risk monitoring & system status
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${sseConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(lastCheckTime)}
              </span>
            </div>
          </div>
          
          {totalUnacknowledged > 0 && (
            <div className="flex gap-2 mt-3">
              {criticalCount > 0 && (
                <Badge className="bg-red-600 text-white">
                  {criticalCount} Critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-orange-500 text-white">
                  {highCount} High
                </Badge>
              )}
            </div>
          )}
        </div>

        <ScrollArea className="h-96">
          <div className="p-2">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-green-700">All Clear</p>
                <p className="text-xs text-muted-foreground">No critical alerts at this time</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border transition-all ${
                      alert.acknowledged 
                        ? 'bg-muted/50 opacity-60' 
                        : 'bg-background hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className={`mt-0.5 ${getSeverityColor(alert.severity)} p-1 rounded`}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            {alert.riskScore && (
                              <Badge variant="outline" className="text-xs">
                                Risk: {alert.riskScore.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(alert.timestamp)}
                            </div>
                            {alert.source && (
                              <span className="text-xs text-muted-foreground">
                                • {alert.source}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!alert.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-muted"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {alerts.length > 0 && (
          <div className="p-3 border-t bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {alerts.filter(a => a.acknowledged).length} of {alerts.length} acknowledged
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })))}
              >
                Acknowledge All
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
} 