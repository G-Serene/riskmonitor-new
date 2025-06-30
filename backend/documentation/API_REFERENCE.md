# Quick API Reference

## Core Endpoints for Next.js Frontend

### 🏠 Main Dashboard Data
```http
GET /api/risk/dashboard
```
**Returns:** Complete dashboard with all metrics, trending topics, risk breakdown, geographic data

### 📰 News Articles
```http
GET /api/news/latest?limit=20&severity=Critical&is_breaking=true
GET /api/news/feed
GET /api/news/{id}
```

### 📊 Analytics & Trends  
```http
GET /api/analytics/trends?days=7
GET /api/risk/calculations?limit=30
GET /api/market/exposures?min_amount=1000000
```

### 🔴 Real-time Streams (SSE)
```http
GET /api/stream/news     # New articles
GET /api/stream/risk     # Risk updates
```

## Key Data Structures

### News Article
```typescript
interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source_name: string;
  published_date: string;
  severity_level: "Critical" | "High" | "Medium" | "Low";
  primary_risk_category: string;
  overall_risk_score: number;        // 0-10
  financial_exposure: number;        // USD
  countries: string[];
  coordinates: {lat: number, lng: number} | null;
  risk_color: string;               // Hex color
  is_breaking_news: boolean;
  keywords: string[];
  entities: string[];
}
```

### Dashboard Summary
```typescript
interface DashboardSummary {
  overall_risk_score: number;        // 0-10
  risk_trend: "Rising" | "Falling" | "Stable" | "Volatile";
  total_exposure: number;            // USD
  critical_alerts: number;
  total_news_today: number;
  critical_count: number;
  high_count: number;
  avg_sentiment: number;            // -1 to 1
}
```

### Risk Breakdown
```typescript
interface RiskBreakdown {
  category: string;                 // "market_risk", "credit_risk", etc.
  news_count: number;
  percentage: number;               // 0-100
  chart_color: string;             // Hex color for charts
}
```

### Geographic Risk
```typescript
interface GeographicRisk {
  country: string;
  region: string;                   // "north_america", "europe", etc.
  coordinates: {lat: number, lng: number} | null;
  news_count: number;
  risk_weight: number;
  total_exposure: number;           // USD
  avg_sentiment: number;            // -1 to 1
}
```

### Trending Topic
```typescript
interface TrendingTopic {
  keyword: string;
  frequency: number;                // Total mentions
  avg_impact_score: number;         // 0-100
  latest_mention: string;           // ISO timestamp
  recent_mentions: number;          // Last 6 hours
}
```

## Color Coding Standards

### Severity Colors
- **Critical**: `#DC2626` (Red)
- **High**: `#EA580C` (Orange)
- **Medium**: `#CA8A04` (Yellow)
- **Low**: `#16A34A` (Green)

### Risk Categories
- **Market Risk**: `#DC2626`
- **Credit Risk**: `#7C3AED`
- **Operational Risk**: `#EA580C`
- **Liquidity Risk**: `#0891B2`

## SSE Event Handling

### News Stream Events
```javascript
const eventSource = new EventSource('/api/stream/news');

eventSource.addEventListener('news_update', (event) => {
  const article = JSON.parse(event.data);
  // Handle new article
});

eventSource.addEventListener('heartbeat', (event) => {
  // Connection alive
});
```

### Error Handling
```javascript
eventSource.addEventListener('error', (event) => {
  // Reconnection logic
  setTimeout(() => {
    eventSource.close();
    // Recreate connection
  }, 5000);
});
```

## Development Commands

```bash
# Start backend services
uvicorn risk_dashboard_api:app --reload --port 8000
python -m huey.bin.huey_consumer news_risk_analyzer.huey

# Development utilities
python dev_utils.py reset        # Clear all data
python dev_utils.py add-test 5   # Add test articles
python dev_utils.py status       # Check system
python dev_utils.py monitor      # Live monitoring
```

## Common Query Parameters

### Pagination
- `limit`: Items per page (1-500)
- `offset`: Skip items

### Filtering
- `severity`: "Critical", "High", "Medium", "Low"
- `risk_category`: Filter by risk type
- `is_trending`: true/false
- `is_breaking`: true/false
- `days`: Time range for analytics

### Response Format
All endpoints return JSON with consistent structure:
```json
{
  "data": [...],           // Main data
  "total_count": 100,      // For pagination
  "generated_at": "2025-06-29T19:30:00Z"
}
```
