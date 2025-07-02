"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type {
  NewsArticle,
  DashboardSummary,
  RiskBreakdown,
} from "@/lib/api-client"

interface SSEDashboardData {
  dashboardSummary: DashboardSummary | null
  newsArticles: NewsArticle[]
  riskBreakdown: RiskBreakdown[]
  criticalAlerts: number
  overallRiskScore: number
  riskTrend: string
}

interface SSEStatus {
  isConnected: boolean
  lastUpdate: string | null
  error: string | null
}

export function useDashboardSSE() {
  const [data, setData] = useState<SSEDashboardData>({
    dashboardSummary: null,
    newsArticles: [],
    riskBreakdown: [],
    criticalAlerts: 0,
    overallRiskScore: 0,
    riskTrend: "Stable",
  })

  const [status, setStatus] = useState<SSEStatus>({
    isConnected: false,
    lastUpdate: null,
    error: null,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Helper function to safely parse JSON from SSE events
  const safeJsonParse = (data: string, eventType: string) => {
    try {
      const parsed = JSON.parse(data)
      console.log(`✅ [SSE] Successfully parsed JSON for ${eventType}`)
      return parsed
    } catch (error) {
      console.error(`❌ [SSE] Failed to parse JSON for ${eventType}:`, error)
      console.error(`❌ [SSE] Raw data that failed to parse:`, data)
      return null
    }
  }

  // Helper function to extract event data from flexible envelope pattern
  const extractEventData = (eventData: any) => {
    // Check if this is the new flexible envelope pattern
    if (eventData && typeof eventData === 'object' && 'event_data' in eventData) {
      // New flexible pattern: { event_id, event_type, envelope_type, event_data, priority, timestamp }
      return {
        originalEventType: eventData.event_type,
        envelopeType: eventData.envelope_type,
        actualData: eventData.event_data,
        eventId: eventData.event_id,
        priority: eventData.priority,
        timestamp: eventData.timestamp
      }
    } else {
      // Legacy pattern: direct event data
      return {
        originalEventType: null,
        envelopeType: null,
        actualData: eventData,
        eventId: null,
        priority: null,
        timestamp: eventData?.timestamp
      }
    }
  }

  // Helper function to handle events by type
  const handleEventByType = (eventType: string, eventData: any) => {
    // Extract data using flexible envelope pattern
    const extracted = extractEventData(eventData)
    const actualData = extracted.actualData
    const currentTime = extracted.timestamp || new Date().toISOString()
    
    // Log flexible event system info
    if (extracted.originalEventType) {
      console.log(`🎯 [SSE] Flexible Event - Original: ${extracted.originalEventType}, Envelope: ${extracted.envelopeType}, Priority: ${extracted.priority}`)
    }
    
    switch (eventType) {
      case 'news_update':
        console.log("📈 [SSE] Handling news_update event")
        // Trigger a refresh of the news feed
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
        
      case 'news_feed_update':
        console.log("📰 [SSE] Handling news_feed_update event")
        if (actualData.articles) {
          setData((prev) => ({
            ...prev,
            newsArticles: actualData.articles,
          }))
          console.log("✅ [SSE] News articles updated in state")
        }
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
        
      case 'dashboard_summary_update':
        console.log("📊 [SSE] Handling dashboard_summary_update event")
        // Validate dashboard summary data before updating
        if (actualData && 
            typeof actualData === 'object' && 
            'critical_count' in actualData && 
            'high_count' in actualData &&
            'medium_count' in actualData &&
            'low_count' in actualData) {
          
          console.log("✅ [SSE] Valid dashboard summary data received:", actualData)
          setData((prev) => ({
            ...prev,
            dashboardSummary: actualData,
          }))
        } else {
          console.warn("⚠️ [SSE] Incomplete dashboard summary data received:", actualData)
        }
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
        

        
      case 'risk_breakdown_update':
        console.log("📈 [SSE] Handling risk_breakdown_update event")
        if (actualData.breakdown) {
          setData((prev) => ({
            ...prev,
            riskBreakdown: actualData.breakdown,
          }))
        }
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
        
      case 'risk_score_update':
        console.log("⚠️ [SSE] Handling risk_score_update event")
        setData((prev) => ({
          ...prev,
          overallRiskScore: actualData.overall_risk_score || prev.overallRiskScore,
          riskTrend: actualData.risk_trend || prev.riskTrend,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
        

        
      case 'alerts_update':
        console.log("🚨 [SSE] Handling alerts_update event")
        setData((prev) => ({
          ...prev,
          criticalAlerts: actualData.critical_count || prev.criticalAlerts,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
        
      case 'alert_new':
        console.log("🚨 [SSE] Handling alert_new event")
        if (actualData.event_data || actualData.error) {
          setData((prev) => ({
            ...prev,
            criticalAlerts: prev.criticalAlerts + 1,
          }))
        }
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
        
      case 'connection':
        console.log("🚀 [SSE] Handling connection event")
        setStatus((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
          lastUpdate: currentTime,
        }))
        break
        
      case 'error':
        console.error("❌ [SSE] Handling error event:", actualData)
        setStatus((prev) => ({
          ...prev,
          error: actualData.error || "SSE error occurred",
        }))
        break
        
      default:
        console.log(`🤷 [SSE] Unhandled event type: ${eventType}`, eventData)
        setStatus((prev) => ({ ...prev, lastUpdate: currentTime }))
        break
    }
  }

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const sseUrl = `${API_BASE_URL}/api/stream/dashboard`
    console.log("🔗 [SSE] Connecting to SSE endpoint:", sseUrl)
    
    const eventSource = new EventSource(sseUrl)
    eventSourceRef.current = eventSource

    // Connection opened
    eventSource.onopen = () => {
      console.log("✅ [SSE] Connection opened successfully")
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }))
    }

    // Connection error
    eventSource.onerror = (error) => {
      console.error("❌ [SSE] Connection error:", error)
      console.log("📊 [SSE] EventSource readyState:", eventSource.readyState)
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        error: "Connection failed. Retrying...",
      }))
    }

    // Generic message handler for debugging - this captures ALL events
    eventSource.onmessage = (event) => {
      console.log("📨 [SSE] Generic message received:")
      console.log("  - Type: generic message")
      console.log("  - Data:", event.data)
      console.log("  - Last Event ID:", event.lastEventId)
      console.log("  - Origin:", event.origin)
      
      // Try to parse the raw SSE data manually since typed events aren't working
      try {
        const lines = event.data.split('\n')
        let eventType = null
        let eventData = null
        
        for (let line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.substring(7).trim()
          } else if (line.startsWith('data: ')) {
            eventData = line.substring(6).trim()
          }
        }
        
        if (eventType && eventData) {
          console.log(`🎯 [SSE] Parsed event type: ${eventType}`)
          const parsedData = safeJsonParse(eventData, eventType)
          if (parsedData) {
            handleEventByType(eventType, parsedData)
          }
        } else {
          // Try to parse the entire event.data as JSON directly
          const parsedData = safeJsonParse(event.data, "generic")
          if (parsedData && parsedData.event_type) {
            console.log(`🎯 [SSE] Direct parsed event type: ${parsedData.event_type}`)
            handleEventByType(parsedData.event_type, parsedData)
          }
        }
      } catch (error) {
        console.error("❌ [SSE] Error parsing generic message:", error)
      }
    }

    // Connection established
    eventSource.addEventListener("connection", (event: MessageEvent) => {
      console.log("🚀 [SSE] Connection event received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "connection")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        setStatus((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
          lastUpdate: eventData.timestamp,
        }))
        console.log("✅ [SSE] Connected:", eventData.message)
      }
    })

    // News feed updates
    eventSource.addEventListener("news_feed_update", (event: MessageEvent) => {
      console.log("📰 [SSE] News feed update received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "news_feed_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        console.log("  - Articles count:", eventData.articles?.length || 0)
        setData((prev) => ({
          ...prev,
          newsArticles: eventData.articles,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
        console.log("✅ [SSE] News articles updated in state")
      }
    })

    // News update events (individual news processing)
    eventSource.addEventListener("news_update", (event: MessageEvent) => {
      console.log("📈 [SSE] News update event received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "news_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        console.log("  - Event type:", eventData.event_type)
        console.log("  - News ID:", eventData.event_data?.news_id)
        // Note: This doesn't update state directly, but triggers other updates
      }
    })

    // Dashboard summary updates
    eventSource.addEventListener("dashboard_summary_update", (event) => {
      console.log("📊 [SSE] Dashboard summary update received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "dashboard_summary_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        // Validate dashboard summary data before updating
        if (eventData && 
            typeof eventData === 'object' && 
            'critical_count' in eventData && 
            'high_count' in eventData &&
            'medium_count' in eventData &&
            'low_count' in eventData) {
          
          setData((prev) => ({
            ...prev,
            dashboardSummary: eventData,
          }))
          console.log("✅ [SSE] Dashboard summary updated in state:", eventData)
        } else {
          console.warn("⚠️ [SSE] Incomplete dashboard summary data received, not updating state:", eventData)
        }
        setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
      }
    })



    // Risk breakdown updates
    eventSource.addEventListener("risk_breakdown_update", (event) => {
      console.log("📈 [SSE] Risk breakdown update received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "risk_breakdown_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        console.log("  - Breakdown items:", eventData.breakdown?.length || 0)
        setData((prev) => ({
          ...prev,
          riskBreakdown: eventData.breakdown,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
        console.log("✅ [SSE] Risk breakdown updated in state")
      }
    })

    // Risk score updates
    eventSource.addEventListener("risk_score_update", (event) => {
      console.log("⚠️ [SSE] Risk score update received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "risk_score_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        console.log("  - Risk score:", eventData.overall_risk_score)
        console.log("  - Risk trend:", eventData.risk_trend)
        setData((prev) => ({
          ...prev,
          overallRiskScore: eventData.overall_risk_score,
          riskTrend: eventData.risk_trend,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
        console.log("✅ [SSE] Risk score updated in state")
      }
    })

    // Exposure updates removed as requested

    // Trending topics updates
    eventSource.addEventListener("trending_topics_update", (event) => {
      console.log("🔥 [SSE] Trending topics update received:")
      console.log("  - Raw data:", (event as MessageEvent).data)
      const eventData = safeJsonParse((event as MessageEvent).data, "trending_topics_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        console.log("  - Topics count:", eventData.topics?.length || 0)
        setData((prev) => ({
          ...prev,
          trendingTopics: eventData.topics,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
        console.log("✅ [SSE] Trending topics updated in state")
      }
    })

    // Heatmap updates
    eventSource.addEventListener("heatmap_update", (event) => {
      console.log("🗺️ [SSE] Heatmap update received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "heatmap_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        console.log("  - Geographic data count:", eventData.geographic_data?.length || 0)
        setData((prev) => ({
          ...prev,
          geographicRisk: eventData.geographic_data,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
        console.log("✅ [SSE] Geographic risk updated in state")
      }
    })

    // Alerts updates
    eventSource.addEventListener("alerts_update", (event) => {
      console.log("🚨 [SSE] Alerts update received:")
      console.log("  - Raw data:", event.data)
      const eventData = safeJsonParse(event.data, "alerts_update")
      if (eventData) {
        console.log("  - Parsed data:", eventData)
        console.log("  - Critical alerts count:", eventData.critical_count)
        setData((prev) => ({
          ...prev,
          criticalAlerts: eventData.critical_count,
        }))
        setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
        console.log("✅ [SSE] Critical alerts updated in state")
      }
    })

    // Error handling
    eventSource.addEventListener("error", (event) => {
      console.error("❌ [SSE] Error event:", event)
      setStatus((prev) => ({
        ...prev,
        error: "SSE connection error occurred",
      }))
    })

    // Connection error handling
    eventSource.onerror = (error) => {
      console.error("❌ [SSE] Connection Error:", error)
      console.log("📊 [SSE] EventSource readyState on error:", eventSource.readyState)
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        error: "Connection lost",
      }))

      // Attempt to reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("🔄 [SSE] Attempting to reconnect SSE...")
        connect()
      }, 5000)
    }

    // Add a catch-all event listener to log any events we might be missing
    const eventTypes = [
      'news_update', 'risk_change', 'alert_new', 'dashboard_refresh',
      'risk_update', 'exposure_update', 'ping'
    ]
    
    eventTypes.forEach(eventType => {
      if (!['news_update', 'news_feed_update', 'dashboard_summary_update', 
            'sentiment_update', 'risk_breakdown_update', 'risk_score_update',
            'trending_topics_update', 'heatmap_update', 'alerts_update'].includes(eventType)) {
        eventSource.addEventListener(eventType, (event) => {
          console.log(`🎯 [SSE] Unhandled event type '${eventType}' received:`)
          console.log("  - Raw data:", (event as MessageEvent).data)
        })
      }
    })

  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return { data, status, reconnect: connect }
}
