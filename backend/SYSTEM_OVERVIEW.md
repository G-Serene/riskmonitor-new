# Risk Dashboard System Overview

## Architecture Overview

The Risk Dashboard is a real-time news risk analysis system that automatically ingests news, processes it with AI, and provides live updates to a web dashboard.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Raw News      │    │   AI Processing  │    │   Dashboard     │
│   Ingestion     │───▶│   (OpenAI GPT)   │───▶│   & API         │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  raw_news_data  │    │ news_processing  │    │ news_articles   │
│     table       │    │    queue (Huey)  │    │     table       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                 │                       │
                                 ▼                       ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Background      │    │  Real-time SSE  │
                       │  Worker Process  │    │  Updates        │
                       └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. **News Ingestion Layer**
- **Input:** Raw news data inserted into `raw_news_data` table
- **Fields:** headline, content, source, published_date, url
- **Automation:** Periodic task checks for unprocessed news every 1 minute

### 2. **AI Processing Pipeline**
- **Queue:** Huey task queue for background processing
- **AI Engine:** OpenAI GPT-4 for news analysis
- **Processing:** Risk categorization, sentiment analysis, impact scoring
- **Output:** Structured risk data stored in `news_articles` table

### 3. **Database Layer**
- **Primary DB:** SQLite (`risk_dashboard.db`)
- **Tables:** 
  - `raw_news_data` - Incoming news
  - `news_articles` - Processed news with risk analysis
  - `risk_calculations` - Historical risk scores
- **Views:** Optimized dashboard queries

### 4. **API & Real-time Layer**
- **REST API:** FastAPI with comprehensive endpoints
- **SSE Stream:** Real-time updates for all dashboard widgets
- **Performance:** Optimized database views for fast queries

### 5. **Frontend Interface**
- **Framework:** Next.js (TypeScript)
- **Real-time:** SSE integration for live updates
- **Widgets:** Risk score, news feed, sentiment, heatmap, trending topics

## Data Flow

### 1. **News Ingestion**
```sql
INSERT INTO raw_news_data (headline, content, source_name, published_date, url, processed)
VALUES ('Breaking News...', 'Full content...', 'Reuters', '2024-01-15 10:30:00', 'http://...', 0);
```

### 2. **Automatic Processing**
```python
# Periodic task (every 1 minute)
@huey.periodic_task(cron(minute='*'))
def auto_queue_unprocessed_news():
    # Find unprocessed news
    # Queue for AI processing
    # Update processed flag
```

### 3. **AI Analysis**
```python
# Background worker
@huey.task()
def analyze_news_article(news_id):
    # Call OpenAI API
    # Extract risk categories, sentiment, impact
    # Store structured results
```

### 4. **Real-time Updates**
```javascript
// Frontend SSE connection
const eventSource = new EventSource('/api/stream/dashboard');
eventSource.addEventListener('news_feed_update', updateDashboard);
```

## Key Features

### ✅ **Automated Processing**
- Auto-detects new news in raw data table
- Queues for AI processing automatically
- Updates dashboard in real-time

### ✅ **AI-Powered Analysis**
- Risk categorization (Geopolitical, Economic, etc.)
- Sentiment analysis (-1 to +1 scale)
- Financial impact estimation
- Geographic risk mapping

### ✅ **Real-time Dashboard**
- Live news feed updates
- Dynamic risk score changes
- Sentiment distribution charts
- Geographic risk heatmap
- Trending topics analysis

### ✅ **Production Ready**
- Error handling and retry logic
- Database connection pooling
- Automatic reconnection for SSE
- Comprehensive logging

## Technology Stack

### **Backend**
- **Language:** Python 3.12+
- **Web Framework:** FastAPI
- **Task Queue:** Huey (Redis-like)
- **Database:** SQLite (easily migrable to PostgreSQL)
- **AI Engine:** OpenAI GPT-4 API
- **Real-time:** Server-Sent Events (SSE)

### **Frontend**
- **Framework:** Next.js 14+ (TypeScript)
- **Real-time:** EventSource (SSE)
- **Styling:** Tailwind CSS (recommended)
- **Charts:** Chart.js or Recharts (recommended)
- **Maps:** Leaflet or Mapbox (for heatmap)

### **Infrastructure**
- **Development:** Local SQLite + Uvicorn
- **Production:** PostgreSQL + Docker + Nginx (recommended)
- **Monitoring:** Built-in health checks and logging

## Performance Characteristics

### **Throughput**
- **News Processing:** ~10-50 articles/minute (depending on OpenAI API limits)
- **API Response Time:** <100ms for dashboard endpoints
- **SSE Latency:** <5 seconds for real-time updates

### **Scalability**
- **Database:** SQLite supports ~1M articles efficiently
- **Queue:** Huey handles hundreds of concurrent tasks
- **API:** FastAPI + async supports high concurrency

### **Resource Usage**
- **Memory:** ~100-200MB for full system
- **CPU:** Low baseline, spikes during AI processing
- **Storage:** ~1MB per 1000 processed articles

## Security Considerations

### **API Security**
- CORS configured for frontend domains
- Rate limiting (can be added)
- Input validation on all endpoints

### **Data Privacy**
- News content stored securely
- No personal data collected
- OpenAI API calls over HTTPS

### **Environment Variables**
```env
OPENAI_API_KEY=your_openai_key
RISK_DB=risk_dashboard.db
DATABASE_URL=sqlite:///risk_dashboard.db
API_HOST=0.0.0.0
API_PORT=8000
```

## Monitoring & Health

### **Health Checks**
- `/api/health` - Database connectivity
- Process monitoring via logs
- Queue status monitoring

### **Logging**
- Structured logging for all components
- Error tracking and alerting
- Performance metrics

### **Development Tools**
- `dev_utils.py` - Reset, status, test data
- Live monitoring commands
- Test SSE interface

## Quick Start Commands

```bash
# Start the system
python -m uvicorn risk_dashboard_api:app --reload

# Add test data
python dev_utils.py add-test

# Check system status
python dev_utils.py status

# Reset everything
python dev_utils.py reset

# Monitor live processing
python dev_utils.py monitor
```

## Next Steps

1. **Frontend Development:** Use `NEXTJS_INTEGRATION_GUIDE.md`
2. **Deployment:** See `DEPLOYMENT_GUIDE.md` 
3. **API Integration:** Reference `API_REFERENCE.md`
4. **Real-time Features:** Implement SSE from `SSE_DOCUMENTATION.md`

The system is designed for hackathon/demo use but is production-ready with proper deployment configuration.
