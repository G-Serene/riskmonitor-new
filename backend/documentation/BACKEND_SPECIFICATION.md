# Backend Specification for Next.js Frontend

## Overview
This document provides complete backend specifications for building a modern Next.js frontend for the Banking Risk Dashboard. The system processes news articles through OpenAI for risk analysis and provides real-time updates.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Raw News      │───▶│   News Risk      │───▶│   Dashboard     │
│   Ingestion     │    │   Analyzer       │    │   Frontend      │
│   (SQLite)      │    │   (OpenAI+Huey)  │    │   (Next.js)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ raw_news_data   │    │ Background       │    │ FastAPI Server  │
│ (unprocessed)   │    │ Processing       │    │ + SSE Streaming │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Database Schema

### Primary Tables

#### 1. `news_articles` (Processed News)
Main table containing AI-analyzed news articles.

```sql
CREATE TABLE news_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headline TEXT NOT NULL,                    -- News headline
    content TEXT,                             -- Full article content
    summary TEXT,                             -- AI-generated summary
    source_name TEXT NOT NULL,                -- Source (Reuters, Bloomberg, etc.)
    published_date DATETIME NOT NULL,         -- Original publication date
    processed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Risk Analysis (AI Generated)
    risk_categories TEXT,                     -- JSON array: ["market_risk"]
    risk_subcategories TEXT,                  -- JSON array: ["interest_rate_risk"]
    primary_risk_category TEXT,               -- Main category for filtering
    severity_level TEXT DEFAULT 'Low',        -- Critical|High|Medium|Low
    confidence_score INTEGER DEFAULT 50,      -- AI confidence (0-100)
    sentiment_score REAL DEFAULT 0,           -- Sentiment (-1 to 1)
    impact_score INTEGER DEFAULT 50,          -- Impact score (0-100)
    overall_risk_score REAL DEFAULT 0,        -- Calculated risk (0-10)
    
    -- Financial Impact
    financial_exposure REAL DEFAULT 0,        -- USD exposure amount
    exposure_currency TEXT DEFAULT 'USD',
    risk_contribution REAL DEFAULT 0,         -- % contribution to total risk
    
    -- Geographic & Market Data
    geographic_regions TEXT,                   -- JSON: ["europe", "north_america"]
    industry_sectors TEXT,                     -- JSON: ["financial_services"]
    countries TEXT,                           -- JSON: ["Germany", "France"]
    coordinates TEXT,                         -- JSON: {"lat": 51.1657, "lng": 10.4515}
    affected_markets TEXT,                    -- JSON: ["DAX", "CAC40"]
    
    -- Time-based Classifications
    temporal_impact TEXT DEFAULT 'Medium-term', -- Immediate|Short-term|Medium-term|Long-term
    urgency_level TEXT DEFAULT 'Low',           -- Critical|High|Medium|Low
    
    -- Dashboard Flags
    is_market_moving BOOLEAN DEFAULT 0,
    is_regulatory BOOLEAN DEFAULT 0,
    is_breaking_news BOOLEAN DEFAULT 0,
    is_trending BOOLEAN DEFAULT 0,
    requires_action BOOLEAN DEFAULT 0,
    
    -- UI Display
    risk_color TEXT DEFAULT '#gray',           -- Hex color for severity
    display_priority INTEGER DEFAULT 50,       -- Sort priority (1-100)
    
    -- Metadata
    status TEXT DEFAULT 'New',                -- New|Reviewed|Archived
    keywords TEXT,                            -- JSON: ["ecb", "interest_rates"]
    entities TEXT,                           -- JSON: ["European Central Bank"]
    tags TEXT,                               -- JSON: Custom tags
    description TEXT,                        -- AI reasoning for risk analysis
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `market_exposures` (Financial Exposures)
Detailed financial exposure breakdown by asset class.

```sql
CREATE TABLE market_exposures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id INTEGER REFERENCES news_articles(id),
    asset_class TEXT NOT NULL,               -- Equities|Bonds|Loans|Derivatives
    exposure_amount REAL NOT NULL,           -- USD amount
    currency TEXT DEFAULT 'USD',
    risk_contribution REAL,                  -- % of total exposure
    market_sector TEXT,                      -- Financial Services|Government|etc
    exposure_type TEXT,                      -- Direct|Indirect|Counterparty
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `risk_calculations` (Daily Risk Scores)
Daily aggregated risk calculations.

```sql
CREATE TABLE risk_calculations (
    calc_id INTEGER PRIMARY KEY AUTOINCREMENT,
    calculation_date DATE NOT NULL,
    overall_risk_score REAL NOT NULL,       -- 0-10 scale
    total_financial_exposure REAL,          -- Total USD exposure
    exposure_currency TEXT DEFAULT 'USD',
    risk_trend TEXT,                        -- Rising|Falling|Stable|Volatile
    calculation_method TEXT,                -- Algorithm description
    contributing_factors TEXT,              -- JSON array of factors
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. `raw_news_data` (Input Pipeline)
Unprocessed news articles (input to the system).

```sql
CREATE TABLE raw_news_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id TEXT NOT NULL UNIQUE,           -- External news ID
    headline TEXT NOT NULL,
    story TEXT,                            -- Full article content
    news_source TEXT NOT NULL,
    creation_timestamp DATETIME NOT NULL,
    processed BOOLEAN DEFAULT 0,           -- Processing flag
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Optimized Views (Pre-computed for Performance)

#### `dashboard_summary`
```sql
-- Real-time dashboard metrics
SELECT 
    COUNT(*) as total_news_today,
    SUM(CASE WHEN severity_level = 'Critical' THEN 1 ELSE 0 END) as critical_count,
    SUM(CASE WHEN severity_level = 'High' THEN 1 ELSE 0 END) as high_count,
    AVG(sentiment_score) as avg_sentiment,
    SUM(financial_exposure) as total_exposure,
    AVG(overall_risk_score) as current_risk_score
FROM news_articles 
WHERE DATE(published_date) = DATE('now');
```

#### `dashboard_trending_topics`
```sql
-- Top trending keywords with metrics
SELECT 
    keyword,
    COUNT(*) as frequency,
    AVG(impact_score) as avg_impact_score,
    MAX(published_date) as latest_mention,
    COUNT(CASE WHEN published_date >= datetime('now', '-6 hours') THEN 1 END) as recent_mentions
FROM news_articles, json_each(keywords)
WHERE DATE(published_date) = DATE('now')
GROUP BY keyword
ORDER BY frequency DESC;
```

## REST API Endpoints

### Base URL: `http://localhost:8000`

### News Endpoints

#### `GET /api/news/latest`
Get paginated news articles with filtering.

**Query Parameters:**
- `limit` (int, 1-500, default: 50): Items per page
- `offset` (int, default: 0): Pagination offset
- `severity` (string): "Critical|High|Medium|Low"
- `risk_category` (string): Filter by primary_risk_category
- `is_trending` (boolean): Filter trending news
- `is_breaking` (boolean): Filter breaking news

**Response:**
```json
{
  "articles": [
    {
      "id": 123,
      "headline": "Federal Reserve Raises Interest Rates",
      "summary": "AI-generated summary...",
      "source_name": "Reuters",
      "published_date": "2025-06-29T16:00:00Z",
      "severity_level": "High",
      "primary_risk_category": "market_risk",
      "overall_risk_score": 7.2,
      "financial_exposure": 2500000000,
      "countries": ["United States"],
      "coordinates": {"lat": 38.9072, "lng": -77.0369},
      "risk_color": "#EA580C",
      "is_breaking_news": true,
      "keywords": ["fed", "interest_rates", "banking"],
      "entities": ["Federal Reserve", "Jerome Powell"]
    }
  ],
  "total_count": 150,
  "page_info": {
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### `GET /api/news/{news_id}`
Get specific news article by ID.

#### `GET /api/news/feed`
Get recent news feed (optimized, last 20 articles).

### Dashboard Endpoints

#### `GET /api/risk/dashboard`
**Primary endpoint** - Get comprehensive dashboard data.

**Response:**
```json
{
  "dashboard_summary": {
    "overall_risk_score": 6.8,
    "risk_trend": "Rising",
    "total_exposure": 15000000000,
    "critical_alerts": 3,
    "total_news_today": 25,
    "critical_count": 3,
    "high_count": 8,
    "avg_sentiment": -0.3,
    "current_risk_score": 6.8
  },
  "sentiment_analysis": {
    "positive_pct": 20,
    "neutral_pct": 35,
    "negative_pct": 45
  },
  "trending_topics": [
    {
      "keyword": "interest_rates",
      "frequency": 15,
      "avg_impact_score": 85,
      "latest_mention": "2025-06-29T19:30:00Z",
      "recent_mentions": 8
    }
  ],
  "risk_breakdown": [
    {
      "category": "market_risk",
      "news_count": 12,
      "percentage": 48,
      "chart_color": "#DC2626"
    }
  ],
  "geographic_risk": [
    {
      "country": "United States",
      "region": "north_america",
      "coordinates": {"lat": 39.8283, "lng": -98.5795},
      "news_count": 8,
      "risk_weight": 3.2,
      "total_exposure": 8500000000,
      "avg_sentiment": -0.4
    }
  ]
}
```

### Risk & Analytics Endpoints

#### `GET /api/risk/calculations`
Historical risk calculations for charts.

#### `GET /api/market/exposures`
Market exposure details by asset class.

#### `GET /api/analytics/trends`
Trend data for time-series charts.

### Real-time Streaming (SSE)

#### `GET /api/stream/news`
Server-Sent Events for real-time news updates.

**Events:**
- `news_update`: New processed article
- `heartbeat`: Connection keepalive
- `error`: Error messages

#### `GET /api/stream/risk`
Real-time risk calculation updates.

**Events:**
- `risk_update`: New risk calculation
- `dashboard_update`: Complete dashboard refresh

## Server-Sent Events (SSE) for Real-Time Updates

### Unified SSE Endpoint: `/api/stream/dashboard`

The dashboard provides real-time updates for ALL widgets through a single SSE endpoint.

**Connection:** `const eventSource = new EventSource('/api/stream/dashboard');`

**Event Types:**
- `connection` - Stream connection confirmation
- `news_feed_update` - New news articles (live news feed widget)
- `dashboard_summary_update` - Overall metrics update (news counts, totals)
- `sentiment_update` - Sentiment distribution (sentiment chart widget)
- `risk_breakdown_update` - Risk categories (risk breakdown chart)
- `risk_score_update` - Overall risk score (main risk score widget)
- `exposure_update` - Market exposure totals (exposure widget)
- `trending_topics_update` - Trending topics (trending topics widget)
- `heatmap_update` - Geographic risk data (global heatmap widget)
- `alerts_update` - Critical alerts count (alerts widget)
- `error` - Error notifications

**Example Frontend Integration:**
```javascript
const eventSource = new EventSource('/api/stream/dashboard');

// Handle news feed updates
eventSource.addEventListener('news_feed_update', (event) => {
  const data = JSON.parse(event.data);
  updateNewsFeedWidget(data.articles);
});

// Handle risk score updates
eventSource.addEventListener('risk_score_update', (event) => {
  const data = JSON.parse(event.data);
  updateRiskScoreWidget(data.overall_risk_score, data.risk_trend);
});

// Handle sentiment updates
eventSource.addEventListener('sentiment_update', (event) => {
  const data = JSON.parse(event.data);
  updateSentimentChart(data.positive_pct, data.neutral_pct, data.negative_pct);
});
```

**Benefits:**
- Single connection for all widgets
- Automatic widget updates without manual refresh
- Targeted events for efficient updates
- Error handling and reconnection
- Real-time data synchronization

## Data Processing Pipeline

### 1. News Ingestion
- Raw news articles are inserted into `raw_news_data` table
- `processed` flag starts as 0 (unprocessed)

### 2. Automatic Processing
- **Huey worker** runs background tasks
- **Periodic task** runs every 1 minute, finds unprocessed news
- Each article is sent to **OpenAI GPT-4** for risk analysis

### 3. OpenAI Analysis
The system prompts OpenAI to analyze news for:
- **Risk categorization**: market_risk, credit_risk, operational_risk, liquidity_risk
- **Severity assessment**: Critical, High, Medium, Low
- **Financial impact**: USD exposure estimates
- **Geographic impact**: Affected countries/regions
- **Market impact**: Affected markets and instruments
- **Sentiment analysis**: Negative to positive scale
- **Keywords/entities**: Key terms and organizations

### 4. Data Storage
- Processed articles stored in `news_articles` table
- Financial exposures stored in `market_exposures` table
- Daily risk calculations updated in `risk_calculations` table
- Raw news marked as `processed = 1`

### 5. Real-time Updates
- SSE streams notify frontend of new articles
- Dashboard metrics auto-refresh
- No polling required from frontend

## Environment Configuration

### Required Environment Variables
```bash
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Database paths
RISK_DB=risk_dashboard.db
KNOWLEDGE_DB=risk_dashboard.db

# Processing settings
MAX_RETRIES=3
RETRY_DELAY=60
BATCH_SIZE=100
```

### Running the Backend
```bash
# Start API server
uvicorn risk_dashboard_api:app --reload --host 0.0.0.0 --port 8000

# Start background worker (separate terminal)
python -m huey.bin.huey_consumer news_risk_analyzer.huey
```

## Development Utilities

### Quick Commands
```bash
# Reset all data (development only)
python dev_utils.py reset

# Add test news articles
python dev_utils.py add-test 5

# Check system status
python dev_utils.py status

# Live monitoring
python dev_utils.py monitor
```

## Frontend Integration Notes

### 1. API Base URL
- Development: `http://localhost:8000`
- Production: Configure as environment variable

### 2. Real-time Updates
- Use EventSource API for SSE connections
- Handle reconnection logic for network issues
- Parse JSON data from SSE events

### 3. Key Metrics to Display
- **Overall Risk Score**: 0-10 scale with color coding
- **Risk Trend**: Rising/Falling/Stable indicators
- **Total Financial Exposure**: USD amounts with formatting
- **News Counts**: By severity level
- **Geographic Visualization**: Country-based risk heat map
- **Trending Topics**: Word cloud or list with frequencies

### 4. Performance Considerations
- Use optimized view endpoints for dashboard data
- Implement pagination for news lists
- Cache dashboard data for 30-60 seconds
- Use SSE for real-time updates instead of polling

### 5. Error Handling
- Handle 500 errors gracefully
- Show loading states during API calls
- Implement retry logic for failed requests
- Display user-friendly error messages

### 6. Data Formatting
- Format large numbers (billions/millions)
- Display relative timestamps ("2 hours ago")
- Use color coding for severity levels
- Format percentages and decimals consistently

This specification provides everything needed to build a modern Next.js frontend that integrates seamlessly with the banking risk analysis backend.
