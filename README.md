# Risk Monitor 🏦📊

A real-time risk monitoring dashboard for international banking, providing actionable insights through news analysis and risk assessment.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)

## 🎯 Features

### Real-time Risk Analysis
- **Live News Feed** with relative time display (e.g., "2 hours ago")
- **Risk Score Calculation** (0-10 scale) with trend analysis
- **Sentiment Analysis** (-1 to +1 scale) for market sentiment
- **Color-coded Risk Categories** with visual indicators

### Interactive Dashboard
- **KPI Cards** showing critical metrics
- **Risk Breakdown** pie chart by category
- **Geographic Risk Distribution** with country-level data
- **Trending Topics** with keyword analysis
- **Advanced Filtering** with visual feedback

### Professional UI/UX
- **Actionable Risk Pills**: Trending 📈, Market Moving 📊, Action Required ⚠️, Industry Sectors 🏭
- **Real-time Updates** via Server-Sent Events (SSE)
- **Responsive Design** optimized for banking dashboards
- **Clean, Scannable Layout** focused on risk management

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (SQLite)      │
│                 │    │                 │    │                 │
│ • React 18      │    │ • REST APIs     │    │ • News Articles │
│ • TypeScript    │    │ • SSE Streaming │    │ • Risk Calc     │
│ • Tailwind CSS  │    │ • News Analysis │    │ • Trending Data │
│ • ShadCN UI     │    │ • OpenAI LLM    │    │ • Geo Data      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- OpenAI API Key

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
