# Risk Monitor 🏦📊

A comprehensive real-time financial risk monitoring system that analyzes news data using AI to provide actionable risk insights for international banking operations.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-orange.svg)

## 🎯 Features

### AI-Powered Risk Analysis
- **GPT-4o Risk Assessment** with evaluator-optimizer pattern for enhanced accuracy
- **LLM-Based Theme Classification** using GPT-4o-mini for intelligent categorization
- **17 Financial Risk Themes** including credit crisis, market volatility, cyber security, etc.
- **Impact Assessment Generation** with comprehensive storylines for executive reporting
- **Smart Article Selection** for large datasets with intelligent prioritization
- **Real-time Processing** with background task queue (Huey)

### Interactive Dashboard
- **Real-time Risk Monitoring** with live SSE updates
- **Executive KPI Cards** showing critical risk metrics and trends
- **Geographic Risk Distribution** with country-level analysis
- **Risk Category Breakdown** with visual pie charts and severity indicators
- **Trending Topics** with keyword frequency analysis
- **Advanced Filtering** by severity, category, date range, and geography

### Professional Reporting
- **Impact Assessment Popup** with fullscreen markdown rendering
- **PDF/HTML Export** for executive reports (no JSON download)
- **Cached Storylines** shared across all users for efficiency
- **Executive-level Language** targeted at senior management

### Modern UI/UX
- **Responsive Design** optimized for banking dashboards
- **Real-time Updates** via Server-Sent Events (SSE)
- **Clean Interface** with actionable risk indicators
- **Mobile-friendly** layout with touch-optimized controls

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Engine     │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (OpenAI)      │
│                 │    │                 │    │                 │
│ • React 18      │    │ • REST APIs     │    │ • GPT-4o        │
│ • TypeScript    │    │ • SSE Streaming │    │ • Risk Analysis │
│ • Tailwind CSS  │    │ • Huey Queue    │    │ • Theme Class   │
│ • ShadCN UI     │    │ • Connection    │    │ • Storylines    │
│ • Markdown      │    │   Pooling       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Background    │    │   News Source   │
│   (SQLite)      │    │   Processing    │    │   (Raw Data)    │
│                 │    │                 │    │                 │
│ • news_articles │    │ • Evaluator-    │    │ • raw_news_data │
│ • risk_calc     │    │   Optimizer     │    │ • Continuous    │
│ • themes        │    │ • Auto Queue    │    │   Ingestion     │
│ • storylines    │    │ • Retries       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 18+** with npm/pnpm
- **OpenAI API Key** (GPT-4o access required)

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Database Initialization

```bash
# The database will be auto-created on first run
python news_risk_analyzer.py dev-status  # Check system status
```

### 3. Start Backend Services

```bash
# Terminal 1: Start API server
python -m uvicorn risk_dashboard_api:app --reload --port 8000

# Terminal 2: Start background worker
python -m huey.bin.huey_consumer news_risk_analyzer.huey

# Terminal 3: Publish news for processing (if needed)
python news_publisher.py publish-all
```

### 4. Frontend Setup

```bash
cd frontend
npm install  # or pnpm install

# Start development server
npm run dev  # or pnpm dev
```

### 5. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Huey Monitoring:** http://localhost:8080 (when worker is running)

**Port Configuration:**
- **Port 3000:** Next.js frontend development server
- **Port 8000:** FastAPI backend API (main application)
- **Port 8080:** Huey monitoring UI (background worker monitoring)

## 📊 Core Components

### 🧠 AI Processing Pipeline

**Evaluator-Optimizer Pattern:**
```
News Article → Risk Analyzer (GPT-4o) → Evaluator → Optimizer → Final Analysis
                     ↓
Theme Classifier (GPT-4o-mini) → 17 Risk Themes → Database Storage
                     ↓
Storyline Generator (GPT-4o) → Impact Assessment → Executive Reports
```

**Financial Risk Themes:**
1. Credit Crisis
2. Market Volatility Surge  
3. Currency Crisis
4. Interest Rate Shock
5. Geopolitical Crisis
6. Trade War Escalation
7. Regulatory Crackdown
8. Cyber Security Breach
9. Liquidity Shortage
10. Operational Disruption
11. Real Estate Crisis
12. Inflation Crisis
13. Sovereign Debt Crisis
14. Supply Chain Crisis
15. ESG & Climate Risk
16. Systemic Banking Crisis
17. Other Financial Risks

### 💾 Database Schema

**Key Tables:**
- `news_articles` - Processed news with risk analysis
- `risk_calculations` - Daily risk score aggregations  
- `storylines` - Cached impact assessments
- `raw_news_data` - Incoming news data

**Risk Analysis Fields:**
- `severity_level` - Critical/High/Medium/Low
- `primary_risk_category` - Main risk type
- `overall_risk_score` - 0-10 numerical score
- `primary_theme` - One of 17 financial themes
- `confidence_score` - Analysis confidence %

### 🔄 Background Processing

**Huey Task Queue:**
- Automatic news processing every minute
- Retry logic with exponential backoff
- Connection pooling for database efficiency
- Health monitoring and error reporting

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Dashboard data with real-time updates
- `GET /dashboard-stream` - SSE stream for live updates
- `POST /generate-storyline/{theme}` - Generate impact assessment
- `GET /download-storyline/{theme}` - Download PDF/HTML report

### Utility Endpoints  
- `GET /health` - System health check
- `GET /trending-topics` - Current trending risk topics
- `GET /risk-categories` - Available risk categories

## 🔧 Configuration

### Environment Variables (.env)

The system supports both **OpenAI** and **Azure OpenAI** as LLM providers:

#### OpenAI Configuration (Default)
```bash
# LLM Provider Configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration  
RISK_DB=risk_dashboard.db
KNOWLEDGE_DB=risk_dashboard.db

# API Configuration
API_PORT=8000

# Processing Configuration
MAX_RETRIES=3
RETRY_DELAY=60
BATCH_SIZE=100
MAX_OPTIMIZATION_ITERATIONS=2

# Connection Pool Configuration
MAX_CONNECTIONS=5
CONNECTION_TIMEOUT=30
```

#### Azure OpenAI Configuration
```bash
# LLM Provider Configuration
LLM_PROVIDER=azure
LLM_MODEL=gpt-4o

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Database and other configurations (same as above)
RISK_DB=risk_dashboard.db
KNOWLEDGE_DB=risk_dashboard.db
# ... etc
```

#### Setting up Azure OpenAI
1. **Create Azure OpenAI Resource** in Azure Portal
2. **Deploy a GPT-4o Model** and note the deployment name
3. **Get API Key** from the Azure OpenAI resource
4. **Configure Environment Variables**:
   - `AZURE_OPENAI_DEPLOYMENT_NAME`: Your deployment name
   - `AZURE_OPENAI_ENDPOINT`: Your resource endpoint
   - `AZURE_OPENAI_API_KEY`: Your API key
   - `LLM_PROVIDER=azure`

### Frontend Configuration
```javascript
// lib/api-client.ts
const API_BASE_URL = 'http://localhost:8000'
```

## 🛠️ Development

### Running Tests

```bash
# Backend health check
cd backend
python news_risk_analyzer.py dev-status

# Test risk analysis pipeline
python news_risk_analyzer.py dev-add-test 1

# Check API server status
curl http://localhost:8000/health

# Test theme classification (if available)
python financial_risk_themes.py

# Test storyline generation (if available)
python enhanced_storyline_generator.py
```

### Development Commands

The system includes development utilities accessible via `news_risk_analyzer.py`:

```bash
# System status overview (shows LLM config, data counts, etc.)
python news_risk_analyzer.py dev-status

# Reset system (clears all data - USE WITH CAUTION)
python news_risk_analyzer.py dev-reset

# Add test news articles for testing
python news_risk_analyzer.py dev-add-test 5

# Check system health
python news_risk_analyzer.py health-check
```

Or use the integrated dev utilities (if `dev_utils.py` exists):
```bash
python dev_utils.py status
python dev_utils.py reset
python dev_utils.py add-test 5
```

### Code Structure

```
backend/
├── risk_dashboard_api.py      # Main FastAPI application
├── news_risk_analyzer.py      # News processing pipeline
├── evaluator_optimizer.py     # AI analysis engine
├── financial_risk_themes.py   # Theme classification system
├── enhanced_storyline_generator.py  # Impact assessment generation
├── util.py                    # LLM utilities and helpers
└── news_publisher.py          # News ingestion utilities

frontend/
├── app/                       # Next.js app router
├── components/                # React components
│   ├── dashboard/            # Dashboard-specific components
│   ├── charts/               # Chart components  
│   └── ui/                   # Base UI components
├── lib/                      # Utilities and API client
└── types/                    # TypeScript type definitions
```

## 🚦 Monitoring & Health

### System Health Checks
- **Database connectivity** and performance
- **Background worker** status and queue health
- **API response times** and error rates
- **OpenAI API** usage and rate limits

### Real-time Monitoring
- **SSE connection** status for live updates
- **News processing** throughput and errors
- **Risk calculation** accuracy and timeliness

## 📈 Performance

### Optimization Features
- **Connection pooling** for database efficiency
- **Background processing** with Huey task queue
- **Caching** of storylines and risk calculations
- **Smart article selection** for large datasets
- **Efficient SQL queries** with proper indexing

### Scalability
- **SQLite** for development (easily upgradeable to PostgreSQL)
- **Horizontal scaling** ready with container support
- **API rate limiting** and request optimization
- **Background worker** scaling with multiple processes

## 🔒 Security

### Data Protection
- **Environment variables** for sensitive configuration
- **Input validation** and sanitization
- **Error handling** without information leakage
- **Database security** with parameterized queries

### API Security
- **CORS configuration** for frontend access
- **Request validation** with Pydantic models
- **Rate limiting** (configurable)
- **Health endpoint** protection

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for international banking risk management**

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/riskmonitor.git
cd riskmonitor
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your OpenAI API key

# Start the API server
python -m uvicorn risk_dashboard_api:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Dashboard
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Huey Monitoring**: http://localhost:8080 (when worker is running)

## 📡 API Endpoints

### News Endpoints
- `GET /api/news/latest` - Get latest news with filtering
- `GET /api/news/feed` - Get recent news feed (optimized)
- `GET /api/news/{news_id}` - Get specific news article

### Dashboard Endpoints
- `GET /api/risk/dashboard` - Comprehensive dashboard data
- `GET /api/dashboard/trending-topics` - Trending keywords
- `GET /api/dashboard/risk-breakdown` - Risk category breakdown
- `GET /api/dashboard/geographic-risk` - Geographic distribution

### Real-time Streaming
- `GET /api/stream/dashboard` - SSE stream for all dashboard updates
- `GET /api/stream/news` - SSE stream for news updates
- `GET /api/stream/risk` - SSE stream for risk updates

## 🔧 Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
RISK_DB=risk_dashboard.db
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
```

### Frontend Configuration
```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

## 📊 Data Model

### News Article
```typescript
interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  severity_level: 'Critical' | 'High' | 'Medium' | 'Low';
  overall_risk_score: number; // 0-10
  sentiment_score: number; // -1 to +1
  countries: string[];
  industry_sectors: string[];
  is_trending: boolean;
  is_market_moving: boolean;
  requires_action: boolean;
  minutes_ago: number;
}
```

### Trending Topic
```typescript
interface TrendingTopic {
  keyword: string;
  frequency: number;
  avg_impact_score: number;
  recent_mentions: number;
  avg_risk_level: string;
  trend_velocity: number;
}
```

## 🎨 UI Components

### Risk Pills
- **📈 Trending**: Shows trending news items
- **📊 Market Moving**: Indicates market-impacting news
- **⚠️ Action Required**: Highlights items needing attention
- **🏭 Industry**: Shows relevant industry sectors

### Dashboard Widgets
- **KPI Cards**: Risk score, alerts, sentiment
- **Risk Breakdown**: Interactive pie chart
- **Live News Feed**: Real-time updates with pills
- **Geographic Risk**: Country-level risk distribution

## 🔒 Security

- ✅ Environment variables protected with `.gitignore`
- ✅ API key management via `.env.example`
- ✅ CORS configuration for production
- ✅ Input validation and sanitization
- ✅ SQL injection protection

## 🚦 Development

### Backend Development
```bash
# Start with hot reload
uvicorn risk_dashboard_api:app --reload

# Run tests
python -m pytest

# Check code quality
flake8 .
black .
```

### Frontend Development
```bash
# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📈 Performance

- **SSE Streaming**: Real-time updates without polling
- **Optimized Queries**: Database views for fast dashboard loading
- **Lazy Loading**: Components loaded on demand
- **Responsive Caching**: Efficient data fetching

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLite**: Lightweight database
- **OpenAI**: LLM for news analysis
- **Huey**: Task queue for background processing
- **SSE**: Real-time streaming

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS
- **ShadCN UI**: High-quality components
- **Lucide Icons**: Beautiful icons

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Risk Monitor** - Transforming news into actionable risk insights for modern banking 🏦✨
