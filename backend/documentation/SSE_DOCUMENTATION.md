# Server-Sent Events (SSE) Documentation

## Overview

The Risk Dashboard API provides real-time updates for all dashboard widgets through Server-Sent Events. The unified SSE endpoint enables dynamic updates for all components without requiring manual page refreshes.

## Primary SSE Endpoint

### `/api/stream/dashboard`

This is the main SSE endpoint that emits targeted events for all dashboard widgets.

**Connection URL:** `http://localhost:8000/api/stream/dashboard`

**Event Frequency:** Checks every 5 seconds, emits events only when data changes

## SSE Event Types

### 1. `connection`
**Purpose:** Confirms SSE stream connection  
**Timing:** Emitted immediately upon connection  
**Data Structure:**
```json
{
  "status": "connected",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Dashboard SSE stream connected"
}
```

### 2. `news_feed_update`
**Purpose:** New news articles added to the feed  
**Timing:** When new processed news articles are detected  
**Data Structure:**
```json
{
  "articles": [
    {
      "id": 123,
      "headline": "Market volatility increases amid geopolitical tensions",
      "summary": "Brief summary of the news...",
      "source_name": "Reuters",
      "published_date": "2024-01-15T10:25:00Z",
      "severity_level": "High",
      "primary_risk_category": "Geopolitical",
      "sentiment_score": -0.65,
      "financial_exposure": 2500000.0,
      "is_breaking_news": true,
      "risk_color": "#ff6b35",
      "minutes_ago": 5
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "new_count": 3
}
```

### 3. `dashboard_summary_update`
**Purpose:** Overall dashboard metrics change  
**Timing:** When new news affects dashboard totals  
**Data Structure:**
```json
{
  "total_news_today": 15,
  "critical_count": 2,
  "high_count": 5,
  "avg_sentiment": -0.23,
  "total_exposure": 15750000.0,
  "current_risk_score": 73.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. `sentiment_update`
**Purpose:** Sentiment distribution changes  
**Timing:** When new news affects sentiment percentages  
**Data Structure:**
```json
{
  "positive_pct": 25.0,
  "neutral_pct": 45.0,
  "negative_pct": 30.0,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. `risk_breakdown_update`
**Purpose:** Risk category distribution changes  
**Timing:** When new news affects category breakdown  
**Data Structure:**
```json
{
  "breakdown": [
    {
      "category": "Geopolitical",
      "news_count": 5,
      "percentage": 33.3,
      "chart_color": "#ff6b35"
    },
    {
      "category": "Economic",
      "news_count": 4,
      "percentage": 26.7,
      "chart_color": "#4ecdc4"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. `risk_score_update`
**Purpose:** Overall risk score calculation changes  
**Timing:** When new risk calculations are completed  
**Data Structure:**
```json
{
  "overall_risk_score": 73.5,
  "risk_trend": "increasing",
  "calculation_date": "2024-01-15T10:30:00Z",
  "contributing_factors": [
    {
      "factor": "Market Volatility",
      "weight": 0.35,
      "impact": "high"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7. `exposure_update`
**Purpose:** Market exposure changes  
**Timing:** When new market exposures are added  
**Data Structure:**
```json
{
  "total_exposure": 15750000.0,
  "currencies": ["USD", "EUR", "JPY"],
  "new_exposures_count": 2,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 8. `trending_topics_update`
**Purpose:** Trending risk topics change  
**Timing:** Every 30 seconds  
**Data Structure:**
```json
{
  "topics": [
    {
      "keyword": "inflation",
      "frequency": 8,
      "avg_impact_score": 0.75,
      "latest_mention": "2024-01-15T10:25:00Z",
      "recent_mentions": 3,
      "avg_risk_level": "High"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 9. `heatmap_update`
**Purpose:** Geographic risk heatmap data changes  
**Timing:** Every 60 seconds  
**Data Structure:**
```json
{
  "geographic_data": [
    {
      "country": "United States",
      "region": "North America",
      "coordinates": {"lat": 39.8283, "lng": -98.5795},
      "news_count": 8,
      "risk_weight": 0.85,
      "total_exposure": 5500000.0,
      "avg_sentiment": -0.45,
      "latest_news_date": "2024-01-15T10:25:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 10. `alerts_update`
**Purpose:** Critical alerts count  
**Timing:** Every check cycle (5 seconds)  
**Data Structure:**
```json
{
  "critical_count": 2,
  "last_check": "2024-01-15T10:30:00Z",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 11. `error`
**Purpose:** Error notifications  
**Timing:** When exceptions occur  
**Data Structure:**
```json
{
  "error": "Database connection failed",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Frontend Integration Guide

### Basic JavaScript Connection

```javascript
// Connect to the unified dashboard SSE stream
const eventSource = new EventSource('/api/stream/dashboard');

// Handle connection confirmation
eventSource.addEventListener('connection', (event) => {
  const data = JSON.parse(event.data);
  console.log('SSE Connected:', data.message);
});

// Handle news feed updates
eventSource.addEventListener('news_feed_update', (event) => {
  const data = JSON.parse(event.data);
  updateNewsFeed(data.articles);
});

// Handle dashboard summary updates
eventSource.addEventListener('dashboard_summary_update', (event) => {
  const data = JSON.parse(event.data);
  updateDashboardMetrics(data);
});

// Handle sentiment updates
eventSource.addEventListener('sentiment_update', (event) => {
  const data = JSON.parse(event.data);
  updateSentimentChart(data);
});

// Handle risk breakdown updates
eventSource.addEventListener('risk_breakdown_update', (event) => {
  const data = JSON.parse(event.data);
  updateRiskBreakdownChart(data.breakdown);
});

// Handle risk score updates
eventSource.addEventListener('risk_score_update', (event) => {
  const data = JSON.parse(event.data);
  updateOverallRiskScore(data.overall_risk_score, data.risk_trend);
});

// Handle exposure updates
eventSource.addEventListener('exposure_update', (event) => {
  const data = JSON.parse(event.data);
  updateMarketExposure(data.total_exposure);
});

// Handle trending topics updates
eventSource.addEventListener('trending_topics_update', (event) => {
  const data = JSON.parse(event.data);
  updateTrendingTopics(data.topics);
});

// Handle heatmap updates
eventSource.addEventListener('heatmap_update', (event) => {
  const data = JSON.parse(event.data);
  updateGlobalRiskHeatmap(data.geographic_data);
});

// Handle alerts updates
eventSource.addEventListener('alerts_update', (event) => {
  const data = JSON.parse(event.data);
  updateCriticalAlerts(data.critical_count);
});

// Handle errors
eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('SSE Error:', data.error);
});

// Handle connection errors
eventSource.onerror = (error) => {
  console.error('SSE Connection Error:', error);
};
```

### Next.js React Hook

```typescript
import { useEffect, useState } from 'react';

interface DashboardData {
  riskScore: number;
  sentimentData: SentimentData;
  newsArticles: NewsArticle[];
  // ... other dashboard data
}

export const useDashboardSSE = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/stream/dashboard');

    eventSource.addEventListener('connection', () => {
      setIsConnected(true);
    });

    eventSource.addEventListener('news_feed_update', (event) => {
      const data = JSON.parse(event.data);
      setDashboardData(prev => ({
        ...prev,
        newsArticles: data.articles
      }));
    });

    eventSource.addEventListener('risk_score_update', (event) => {
      const data = JSON.parse(event.data);
      setDashboardData(prev => ({
        ...prev,
        riskScore: data.overall_risk_score
      }));
    });

    eventSource.addEventListener('sentiment_update', (event) => {
      const data = JSON.parse(event.data);
      setDashboardData(prev => ({
        ...prev,
        sentimentData: data
      }));
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { dashboardData, isConnected };
};
```

## Legacy SSE Endpoints

For backward compatibility, the following endpoints remain available:

- `/api/stream/news` - News-only updates
- `/api/stream/risk` - Risk calculation updates

## Performance Notes

- The unified endpoint checks for changes every 5 seconds
- Events are only emitted when actual data changes occur
- Geographic and trending topics updates are throttled (30-60 seconds)
- The stream automatically handles database connection errors and reconnection

## Testing the SSE Stream

1. Start the API server: `python risk_dashboard_api.py`
2. Open a test page or use curl:
   ```bash
   curl -N -H "Accept: text/event-stream" http://localhost:8000/api/stream/dashboard
   ```
3. Add new news data to trigger events:
   ```bash
   python dev_utils.py add-test
   ```

## Dashboard Widget Mapping

| Dashboard Widget | SSE Event | Data Field |
|------------------|-----------|------------|
| Overall Risk Score | `risk_score_update` | `overall_risk_score` |
| Alerts Counter | `alerts_update` | `critical_count` |
| Market Exposure | `exposure_update` | `total_exposure` |
| Sentiment Analysis | `sentiment_update` | `positive_pct`, `neutral_pct`, `negative_pct` |
| Global Risk Heatmap | `heatmap_update` | `geographic_data` |
| Trending Topics | `trending_topics_update` | `topics` |
| Live News Feed | `news_feed_update` | `articles` |
| Risk Breakdown | `risk_breakdown_update` | `breakdown` |

This SSE implementation provides comprehensive real-time updates for all dashboard components, enabling a truly dynamic and responsive user interface.
