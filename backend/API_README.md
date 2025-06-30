# Risk Dashboard API Documentation

A FastAPI-based REST API for the Banking Risk Dashboard with real-time SSE streaming capabilities.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- SQLite databases (risk_dashboard.db)
- OpenAI API key

### Installation
```bash
# Install API dependencies
pip install -r api_requirements.txt

# Install main application dependencies
pip install huey openai python-dotenv sse-starlette
```

### Configuration
1. Copy `.env.example` to `.env` and configure:
```env
OPENAI_API_KEY=your_openai_api_key_here
RISK_DB=risk_dashboard.db
KNOWLEDGE_DB=risk_dashboard.db
```

### Running the System

#### Option 1: Using Startup Scripts
```bash
# Linux/Mac
chmod +x startup.sh
./startup.sh start

# Windows
startup.bat start
```

#### Option 2: Manual Startup
```bash
# Terminal 1: Start Huey worker
python -m huey.bin.huey_consumer news_risk_analyzer.huey

# Terminal 2: Start FastAPI server
uvicorn risk_dashboard_api:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Queue news for processing
python news_risk_analyzer.py publish-all
```

## 📡 API Endpoints

### Base URL
- **Local Development**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`

### 📰 News Endpoints

#### GET `/api/news/latest`
Get latest news articles with optional filtering.

**Query Parameters:**
- `limit` (int, 1-500): Number of articles (default: 50)
- `offset` (int, ≥0): Pagination offset (default: 0)
- `severity` (string): Filter by severity (`Critical`, `High`, `Medium`, `Low`)
- `risk_category` (string): Filter by risk category
- `is_trending` (bool): Filter trending news
- `is_breaking` (bool): Filter breaking news

**Example:**
```bash
curl "http://localhost:8000/api/news/latest?limit=10&severity=Critical"
```

**Response:**
```json
{
  "articles": [
    {
      "id": 1,
      "headline": "ECB Raises Interest Rates Amid Inflation Concerns",
      "content": "...",
      "summary": "...",
      "source_name": "Reuters",
      "published_date": "2025-03-03T14:19:55Z",
      "severity_level": "High",
      "confidence_score": 85,
      "overall_risk_score": 7.2,
      "description": "LLM analysis justification...",
      "risk_categories": ["market_risk"],
      "countries": ["Germany", "France"],
      "affected_markets": ["DAX", "CAC40"],
      "...": "..."
    }
  ],
  "total_count": 125,
  "page_info": {
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET `/api/news/{news_id}`
Get a specific news article by ID.

**Example:**
```bash
curl "http://localhost:8000/api/news/1"
```

### 📊 Risk Calculation Endpoints

#### GET `/api/risk/dashboard`
Get comprehensive dashboard summary data.

**Response:**
```json
{
  "latest_risk_calculation": {
    "id": 5,
    "calculation_date": "2025-03-03",
    "overall_risk_score": 6.8,
    "risk_trend": "Rising",
    "contributing_factors": [
      "Market Risk (3 news)",
      "Interest Rates (5 mentions)"
    ]
  },
  "severity_counts": {
    "Critical": 2,
    "High": 8,
    "Medium": 15,
    "Low": 23
  },
  "trending_keywords": [
    {"keyword": "inflation", "frequency": 12},
    {"keyword": "interest_rates", "frequency": 8}
  ],
  "affected_markets": [
    {"market": "DAX", "count": 5},
    {"market": "CAC40", "count": 3}
  ]
}
```

#### GET `/api/risk/calculations`
Get historical risk calculations.

**Query Parameters:**
- `limit` (int, 1-100): Number of calculations (default: 30)
- `days` (int, 1-365): Days to look back (default: 30)

### 💼 Market Exposure Endpoints

#### GET `/api/market/exposures`
Get market exposures data.

**Query Parameters:**
- `limit` (int, 1-500): Number of exposures (default: 100)
- `asset_class` (string): Filter by asset class
- `min_amount` (float): Minimum exposure amount

**Response:**
```json
{
  "exposures": [
    {
      "id": 1,
      "news_id": 5,
      "asset_class": "Equities",
      "exposure_amount": 1500000000,
      "currency": "USD",
      "risk_contribution": 40.0,
      "market_sector": "Financial Services",
      "exposure_type": "Direct",
      "news_headline": "ECB Policy Changes",
      "news_severity": "High"
    }
  ]
}
```

### 📈 Analytics Endpoints

#### GET `/api/analytics/trends`
Get trend analytics data.

**Query Parameters:**
- `days` (int, 1-30): Analysis period (default: 7)

**Response:**
```json
{
  "risk_trend": [
    {
      "date": "2025-03-01",
      "score": 5.2,
      "trend": "Stable"
    }
  ],
  "news_volume": [
    {
      "date": "2025-03-01",
      "total": 25,
      "by_severity": {
        "critical": 1,
        "high": 4,
        "medium": 12,
        "low": 8
      }
    }
  ],
  "category_distribution": [
    {
      "category": "market_risk",
      "count": 15,
      "avg_score": 6.2
    }
  ]
}
```

## 📡 Server-Sent Events (SSE) Streaming

### Real-time News Updates

#### GET `/api/stream/news`
SSE stream for real-time news updates.

**Events:**
- `news_update`: New news article processed
- `heartbeat`: Connection keepalive (every 30s)
- `error`: Error information

**JavaScript Example:**
```javascript
const newsStream = new EventSource('http://localhost:8000/api/stream/news');

newsStream.addEventListener('news_update', function(event) {
    const article = JSON.parse(event.data);
    console.log('New article:', article.headline);
    // Update UI with new article
});

newsStream.addEventListener('heartbeat', function(event) {
    const data = JSON.parse(event.data);
    console.log('Connection alive:', data.timestamp);
});
```

### Real-time Risk Updates

#### GET `/api/stream/risk`
SSE stream for real-time risk calculation updates.

**Events:**
- `risk_update`: New risk calculation
- `dashboard_update`: Dashboard summary update (every 2 minutes)
- `error`: Error information

**JavaScript Example:**
```javascript
const riskStream = new EventSource('http://localhost:8000/api/stream/risk');

riskStream.addEventListener('risk_update', function(event) {
    const calculation = JSON.parse(event.data);
    console.log('Risk score updated:', calculation.overall_risk_score);
});

riskStream.addEventListener('dashboard_update', function(event) {
    const dashboard = JSON.parse(event.data);
    updateDashboard(dashboard);
});
```

## 🏥 Health Check

#### GET `/api/health`
API and database health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-29T12:00:00Z",
  "databases": {
    "risk_db": "connected",
    "knowledge_db": "connected"
  }
}
```

## 🎯 Frontend Integration

### Complete HTML Dashboard
Open `dashboard_frontend.html` in your browser for a complete real-time dashboard demo.

**Features:**
- Real-time news updates via SSE
- Risk score monitoring
- Interactive news filtering
- Responsive design
- Auto-refresh controls

### React/Vue Integration Example
```javascript
// API Service
class RiskDashboardAPI {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }
    
    async getLatestNews(params = {}) {
        const url = new URL(`${this.baseUrl}/api/news/latest`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        
        const response = await fetch(url);
        return response.json();
    }
    
    async getDashboard() {
        const response = await fetch(`${this.baseUrl}/api/risk/dashboard`);
        return response.json();
    }
    
    connectNewsStream(callback) {
        const eventSource = new EventSource(`${this.baseUrl}/api/stream/news`);
        eventSource.addEventListener('news_update', (event) => {
            callback(JSON.parse(event.data));
        });
        return eventSource;
    }
}

// Usage
const api = new RiskDashboardAPI();

// Load initial data
const dashboard = await api.getDashboard();
const news = await api.getLatestNews({ limit: 20, severity: 'High' });

// Connect to real-time updates
const newsStream = api.connectNewsStream((article) => {
    console.log('New article:', article);
});
```

## 🔧 Management Commands

```bash
# Service management
./startup.sh start     # Start all services
./startup.sh stop      # Stop all services
./startup.sh status    # Check service status
./startup.sh logs      # View logs

# Data management
./startup.sh queue     # Queue news for processing
./startup.sh health    # Run health check
```

## 📊 Data Flow

1. **News Processing**: Huey worker processes news from `raw_news_data`
2. **Risk Analysis**: OpenAI analyzes news and stores in `news_articles`
3. **API Access**: FastAPI serves processed data via REST endpoints
4. **Real-time Updates**: SSE streams push new data to connected clients
5. **Frontend Display**: Browser receives and displays real-time updates

## 🚨 Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid parameters
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Database or processing errors
- **503 Service Unavailable**: Health check failures

All errors return JSON with detailed error messages:
```json
{
  "detail": "Error description here"
}
```

## 🔒 Security Considerations

For production deployment:

1. **CORS**: Configure proper CORS origins
2. **Authentication**: Add API key authentication
3. **Rate Limiting**: Implement rate limiting
4. **HTTPS**: Use HTTPS in production
5. **Database**: Secure database connections

## 📝 Logging

Logs are written to:
- `huey-worker.log`: Background processing logs
- `fastapi-server.log`: API server logs

View logs: `./startup.sh logs`

## 🎯 Performance

- **Connection Pooling**: Efficient SQLite connections
- **SSE Optimization**: Heartbeat and error recovery
- **Pagination**: Large datasets handled efficiently
- **Caching**: Consider adding Redis for production

## 📚 Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **SSE Specification**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **Huey Documentation**: https://huey.readthedocs.io/
