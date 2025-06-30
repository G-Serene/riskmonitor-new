"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type {
  NewsArticle,
  DashboardSummary,
  SentimentAnalysis,
  TrendingTopic,
  RiskBreakdown,
  GeographicRisk,
} from "@/lib/api-client"

interface SSEDashboardData {
  dashboardSummary: DashboardSummary | null
  sentimentAnalysis: SentimentAnalysis | null
  newsArticles: NewsArticle[]
  trendingTopics: TrendingTopic[]
  riskBreakdown: RiskBreakdown[]
  geographicRisk: GeographicRisk[]
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
    sentimentAnalysis: null,
    newsArticles: [],
    trendingTopics: [],
    riskBreakdown: [],
    geographicRisk: [],
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

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const sseUrl = `${API_BASE_URL}/api/stream/dashboard`
    console.log("Connecting to SSE endpoint:", sseUrl)
    
    const eventSource = new EventSource(sseUrl)
    eventSourceRef.current = eventSource

    // Connection opened
    eventSource.onopen = () => {
      console.log("SSE connection opened")
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }))
    }

    // Connection error
    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error)
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        error: "Connection failed. Retrying...",
      }))
    }

    // Generic message handler for debugging
    eventSource.onmessage = (event) => {
      console.log("SSE message received:", event.data)
    }

    // Connection established
    eventSource.addEventListener("connection", (event: MessageEvent) => {
      console.log("SSE connection event:", event.data)
      const eventData = JSON.parse(event.data)
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
        lastUpdate: eventData.timestamp,
      }))
      console.log("SSE Connected:", eventData.message)
    })

    // News feed updates
    eventSource.addEventListener("news_feed_update", (event: MessageEvent) => {
      console.log("News update received:", event.data)
      const eventData = JSON.parse(event.data)
      setData((prev) => ({
        ...prev,
        newsArticles: eventData.articles,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Dashboard summary updates
    eventSource.addEventListener("dashboard_summary_update", (event) => {
      const eventData = JSON.parse(event.data)
      setData((prev) => ({
        ...prev,
        dashboardSummary: eventData,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Sentiment updates
    eventSource.addEventListener("sentiment_update", (event) => {
      const eventData = JSON.parse(event.data)
      setData((prev) => ({
        ...prev,
        sentimentAnalysis: eventData,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Risk breakdown updates
    eventSource.addEventListener("risk_breakdown_update", (event) => {
      const eventData = JSON.parse(event.data)
      setData((prev) => ({
        ...prev,
        riskBreakdown: eventData.breakdown,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Risk score updates
    eventSource.addEventListener("risk_score_update", (event) => {
      const eventData = JSON.parse(event.data)
      setData((prev) => ({
        ...prev,
        overallRiskScore: eventData.overall_risk_score,
        riskTrend: eventData.risk_trend,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Exposure updates removed as requested

    // Trending topics updates
    eventSource.addEventListener("trending_topics_update", (event) => {
      const eventData = JSON.parse((event as MessageEvent).data)
      setData((prev) => ({
        ...prev,
        trendingTopics: eventData.topics,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Heatmap updates
    eventSource.addEventListener("heatmap_update", (event) => {
      const eventData = JSON.parse(event.data)
      setData((prev) => ({
        ...prev,
        geographicRisk: eventData.geographic_data,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Alerts updates
    eventSource.addEventListener("alerts_update", (event) => {
      const eventData = JSON.parse(event.data)
      setData((prev) => ({
        ...prev,
        criticalAlerts: eventData.critical_count,
      }))
      setStatus((prev) => ({ ...prev, lastUpdate: eventData.timestamp }))
    })

    // Error handling
    eventSource.addEventListener("error", (event) => {
      const eventData = JSON.parse((event as MessageEvent).data)
      setStatus((prev) => ({
        ...prev,
        error: eventData.error,
      }))
      console.error("SSE Error:", eventData.error)
    })

    // Connection error handling
    eventSource.onerror = (error) => {
      console.error("SSE Connection Error:", error)
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
        console.log("Attempting to reconnect SSE...")
        connect()
      }, 5000)
    }
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
