"""
Risk Dashboard REST API with SSE Streaming

FastAPI-based REST API for the risk dashboard frontend.
Provides endpoints for initial data loading and real-time SSE streaming.

Installation:
pip install fastapi uvicorn sse-starlette

Usage:
uvicorn risk_dashboard_api:app --reload --host 0.0.0.0 --port 8000

Endpoints:
- GET /api/news/latest - Get latest news articles (with filtering)
- GET /api/news/feed - Get recent news feed (optimized view)
- GET /api/news/{news_id} - Get specific news article
- GET /api/risk/dashboard - Get comprehensive dashboard data (optimized views)
- GET /api/risk/calculations - Get risk calculations
- GET /api/analytics/trends - Get trend analytics
- GET /api/dashboard/trending-topics - Get trending topics (optimized view)
- GET /api/dashboard/risk-breakdown - Get risk breakdown by category (optimized view)
- GET /api/dashboard/geographic-risk - Get geographic risk distribution (optimized view)
- GET /api/dashboard/summary - Get basic dashboard summary (optimized view)
- GET /api/stream/news - SSE stream for real-time news updates
- GET /api/stream/risk - SSE stream for real-time risk updates
"""

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
import sqlite3
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
RISK_DB = os.getenv('RISK_DB', 'risk_dashboard.db')
KNOWLEDGE_DB = os.getenv('KNOWLEDGE_DB', 'risk_dashboard.db')

app = FastAPI(
    title="Risk Dashboard API",
    description="REST API for Banking Risk Dashboard with SSE streaming",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# DATABASE CONNECTION UTILITIES
# ==========================================

@contextmanager
def get_risk_db_connection():
    """Get connection to risk dashboard database"""
    conn = sqlite3.connect(RISK_DB, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@contextmanager
def get_knowledge_db_connection():
    """Get connection to knowledge database"""
    conn = sqlite3.connect(KNOWLEDGE_DB, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@contextmanager  
def get_db_connection():
    """Get connection to the main database (defaults to risk dashboard database)"""
    conn = sqlite3.connect(RISK_DB, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def format_news_article(row: sqlite3.Row) -> Dict[str, Any]:
    """Format a news article row for API response with safe JSON parsing"""
    def safe_json_loads(field_name, field_value, default=None):
        """Safely parse JSON with error handling"""
        if not field_value:
            return default if default is not None else []
        try:
            return json.loads(field_value)
        except json.JSONDecodeError as e:
            print(f"JSON parse error for {field_name} (ID: {row['id']}): {e}")
            print(f"Problematic value: {repr(field_value)}")
            return default if default is not None else []
    
    return {
        "id": row["id"],
        "headline": row["headline"],
        "content": row["content"],
        "summary": row["summary"],
        "source_name": row["source_name"],
        "published_date": row["published_date"],
        "processed_date": row["processed_date"],
        "risk_categories": safe_json_loads("risk_categories", row["risk_categories"]),
        "risk_subcategories": safe_json_loads("risk_subcategories", row["risk_subcategories"]),
        "primary_risk_category": row["primary_risk_category"],
        "geographic_regions": safe_json_loads("geographic_regions", row["geographic_regions"]),
        "industry_sectors": safe_json_loads("industry_sectors", row["industry_sectors"]),
        "countries": safe_json_loads("countries", row["countries"]),
        "coordinates": safe_json_loads("coordinates", row["coordinates"], None),
        "affected_markets": safe_json_loads("affected_markets", row["affected_markets"]),
        "severity_level": row["severity_level"],
        "confidence_score": row["confidence_score"],
        "sentiment_score": row["sentiment_score"],
        "impact_score": row["impact_score"],
        "overall_risk_score": row["overall_risk_score"],
        # Financial exposure removed as requested
        "exposure_currency": row["exposure_currency"],
        "risk_contribution": row["risk_contribution"],
        "temporal_impact": row["temporal_impact"],
        "urgency_level": row["urgency_level"],
        "is_market_moving": bool(row["is_market_moving"]),
        "is_regulatory": bool(row["is_regulatory"]),
        "is_breaking_news": bool(row["is_breaking_news"]),
        "is_trending": bool(row["is_trending"]),
        "requires_action": bool(row["requires_action"]),
        "risk_color": row["risk_color"],
        "display_priority": row["display_priority"],
        "alert_sent": bool(row["alert_sent"]),
        "alert_type": row["alert_type"],
        "view_count": row["view_count"],
        "engagement_score": row["engagement_score"],
        "similar_news_count": row["similar_news_count"],
        "status": row["status"],
        "keywords": safe_json_loads("keywords", row["keywords"]),
        "entities": safe_json_loads("entities", row["entities"]),
        "tags": safe_json_loads("tags", row["tags"]),
        "description": row["description"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"]
    }

def format_risk_calculation(row: sqlite3.Row) -> Dict[str, Any]:
    """Format a risk calculation row for API response"""
    return {
        "id": row["calc_id"],
        "calculation_date": row["calculation_date"],
        "overall_risk_score": row["overall_risk_score"],
        "total_financial_exposure": row["total_financial_exposure"],
        "exposure_currency": row["exposure_currency"],
        "risk_trend": row["risk_trend"],
        "calculation_method": row["calculation_method"],
        "contributing_factors": json.loads(row["contributing_factors"]) if row["contributing_factors"] else [],
        "created_at": row["created_at"]
    }

# ==========================================
# NEWS ENDPOINTS
# ==========================================

@app.get("/api/news/latest")
async def get_latest_news(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    severity: Optional[str] = Query(None, pattern="^(Critical|High|Medium|Low)$"),
    risk_category: Optional[str] = Query(None),
    is_trending: Optional[bool] = Query(None),
    is_breaking: Optional[bool] = Query(None)
):
    """Get latest news articles with optional filtering"""
    try:
        with get_risk_db_connection() as conn:
            # Build WHERE clause based on filters
            where_conditions = ["status != 'Archived'"]
            params = []
            
            if severity:
                where_conditions.append("severity_level = ?")
                params.append(severity)
            
            if risk_category:
                where_conditions.append("primary_risk_category = ?")
                params.append(risk_category)
                
            if is_trending is not None:
                where_conditions.append("is_trending = ?")
                params.append(1 if is_trending else 0)
                
            if is_breaking is not None:
                where_conditions.append("is_breaking_news = ?")
                params.append(1 if is_breaking else 0)
            
            where_clause = " AND ".join(where_conditions)
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM news_articles WHERE {where_clause}"
            total_count = conn.execute(count_query, params).fetchone()[0]
            
            # Get paginated results
            query = f"""
                SELECT * FROM news_articles 
                WHERE {where_clause}
                ORDER BY display_priority DESC, published_date DESC
                LIMIT ? OFFSET ?
            """
            params.extend([limit, offset])
            
            rows = conn.execute(query, params).fetchall()
            articles = [format_news_article(row) for row in rows]
            
            return {
                "articles": articles,
                "total_count": total_count,
                "page_info": {
                    "limit": limit,
                    "offset": offset,
                    "has_more": offset + limit < total_count
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error1 (get_latest_news): {str(e)}")

@app.get("/api/news/feed")
async def get_recent_news_feed(limit: int = Query(20, ge=1, le=50)):
    """Get recent news feed using optimized view - simplified data for dashboard sidebar"""
    try:
        with get_risk_db_connection() as conn:
            # Query the main news_articles table to get all required fields for the news feed
            rows = conn.execute("""
                SELECT 
                    id, headline, summary, source_name, published_date, 
                    severity_level, primary_risk_category, sentiment_score,
                    is_breaking_news, risk_color, countries, industry_sectors,
                    overall_risk_score, confidence_score, is_trending, 
                    is_market_moving, requires_action,
                    ROUND((JULIANDAY('now') - JULIANDAY(published_date)) * 24 * 60) as minutes_ago
                FROM news_articles 
                WHERE status != 'Archived'
                ORDER BY published_date DESC 
                LIMIT ?
            """, [limit]).fetchall()
            
            def safe_json_loads(field_value, default=None):
                """Safely parse JSON with error handling"""
                if not field_value:
                    return default if default is not None else []
                try:
                    return json.loads(field_value)
                except json.JSONDecodeError:
                    return default if default is not None else []
            
            articles = []
            for row in rows:
                articles.append({
                    "id": row["id"],
                    "headline": row["headline"],
                    "summary": row["summary"],
                    "source_name": row["source_name"],
                    "published_date": row["published_date"],
                    "severity_level": row["severity_level"],
                    "primary_risk_category": row["primary_risk_category"],
                    "sentiment_score": row["sentiment_score"],
                    "overall_risk_score": row["overall_risk_score"],
                    "confidence_score": row["confidence_score"] or 0,
                    "countries": safe_json_loads(row["countries"], []),
                    "industry_sectors": safe_json_loads(row["industry_sectors"], []),
                    "is_breaking_news": bool(row["is_breaking_news"]),
                    "is_trending": bool(row["is_trending"]),
                    "is_market_moving": bool(row["is_market_moving"]),
                    "requires_action": bool(row["requires_action"]),
                    "risk_color": row["risk_color"],
                    "minutes_ago": int(row["minutes_ago"]) if row["minutes_ago"] else 0
                })
            
            return {
                "articles": articles,
                "count": len(articles),
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error3 (get_recent_news_feed): {str(e)}")

@app.get("/api/news/{news_id}")
async def get_news_article(news_id: int):
    """Get a specific news article by ID"""
    try:
        with get_risk_db_connection() as conn:
            row = conn.execute(
                "SELECT * FROM news_articles WHERE id = ?", 
                [news_id]
            ).fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="News article not found")
            
            return format_news_article(row)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error2 (get_news_article): {str(e)}")

# ==========================================
# RISK CALCULATION ENDPOINTS
# ==========================================

@app.get("/api/risk/dashboard")
async def get_dashboard_summary():
    """Get dashboard summary data using optimized views"""
    def safe_json_parse(value):
        """Safely parse JSON with error handling"""
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError as e:
            print(f"JSON parse error in dashboard: {e}")
            print(f"Problematic value: {repr(value)}")
            return None
    
    try:
        with get_risk_db_connection() as conn:
            # Use dashboard_initial_load view for comprehensive dashboard data
            print("DEBUG: Fetching dashboard_initial_load...")
            dashboard_data = conn.execute("SELECT * FROM dashboard_initial_load").fetchone()
            
            # Get trending topics from the dedicated view
            print("DEBUG: Fetching dashboard_trending_topics...")
            trending_topics = conn.execute("SELECT * FROM dashboard_trending_topics").fetchall()
            
            # Get risk breakdown by category
            print("DEBUG: Fetching dashboard_risk_breakdown...")
            risk_breakdown = conn.execute("SELECT * FROM dashboard_risk_breakdown").fetchall()
            
            # Get geographic risk data
            print("DEBUG: Fetching dashboard_geographic_risk...")
            geographic_risk = conn.execute("SELECT * FROM dashboard_geographic_risk LIMIT 10").fetchall()
            
            print("DEBUG: Building response...")
            # Format the response
            result = {
                "dashboard_summary": {
                    "overall_risk_score": dashboard_data["overall_risk_score"],
                    "risk_trend": dashboard_data["risk_trend"],
                    # Market exposure and total exposure removed as requested
                    "critical_alerts": dashboard_data["critical_alerts"],
                    "total_news_today": dashboard_data["total_news_today"],
                    "critical_count": dashboard_data["critical_count"],
                    "high_count": dashboard_data["high_count"],
                    "avg_sentiment": dashboard_data["avg_sentiment"],
                    "current_risk_score": dashboard_data["current_risk_score"]
                },
                "sentiment_analysis": {
                    "positive_pct": dashboard_data["positive_sentiment_pct"],
                    "neutral_pct": dashboard_data["neutral_sentiment_pct"],
                    "negative_pct": dashboard_data["negative_sentiment_pct"]
                },
                "trending_topics": [
                    {
                        "keyword": row["keyword"],
                        "frequency": row["frequency"],
                        "avg_impact_score": row["avg_impact_score"],
                        "latest_mention": row["latest_mention"],
                        "recent_mentions": row["recent_mentions"],
                        "avg_risk_level": row["avg_risk_level"]
                    } for row in trending_topics
                ],
                "risk_breakdown": [
                    {
                        "category": row["primary_risk_category"],
                        "news_count": row["news_count"],
                        "percentage": row["percentage"],
                        "chart_color": row["chart_color"]
                    } for row in risk_breakdown
                ],
                "geographic_risk": [
                    {
                        "country": row["primary_country"],
                        "region": row["region"],
                        "coordinates": safe_json_parse(row["coordinates"]),
                        "news_count": row["news_count"],
                        "risk_weight": row["risk_weight"],
                        # Total exposure removed as requested
                        "avg_sentiment": row["avg_sentiment"],
                        "latest_news_date": row["latest_news_date"]
                    } for row in geographic_risk
                ],
                "generated_at": datetime.now().isoformat(),
                "cache_timestamp": dashboard_data["cache_timestamp"]
            }
            
            return result
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error4 (get_dashboard_summary): {str(e)}")

@app.get("/api/risk/calculations")
async def get_risk_calculations(
    limit: int = Query(30, ge=1, le=100),
    days: int = Query(30, ge=1, le=365)
):
    """Get historical risk calculations"""
    try:
        with get_risk_db_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM risk_calculations 
                WHERE calculation_date >= DATE('now', '-{} days')
                ORDER BY calculation_date DESC
                LIMIT ?
            """.format(days), [limit]).fetchall()
            
            calculations = [format_risk_calculation(row) for row in rows]
            
            return {
                "calculations": calculations,
                "count": len(calculations)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error5 (get_risk_calculations): {str(e)}")

# ==========================================
# ANALYTICS ENDPOINTS
# ==========================================

@app.get("/api/analytics/trends")
async def get_trend_analytics(days: int = Query(7, ge=1, le=30)):
    """Get trend analytics data"""
    try:
        with get_risk_db_connection() as conn:
            # Risk score trend
            risk_trend = conn.execute("""
                SELECT calculation_date, overall_risk_score, risk_trend
                FROM risk_calculations 
                WHERE calculation_date >= DATE('now', '-{} days')
                ORDER BY calculation_date ASC
            """.format(days)).fetchall()
            
            # News volume by date
            news_volume = conn.execute("""
                SELECT DATE(published_date) as date, 
                       COUNT(*) as total,
                       SUM(CASE WHEN severity_level = 'Critical' THEN 1 ELSE 0 END) as critical,
                       SUM(CASE WHEN severity_level = 'High' THEN 1 ELSE 0 END) as high,
                       SUM(CASE WHEN severity_level = 'Medium' THEN 1 ELSE 0 END) as medium,
                       SUM(CASE WHEN severity_level = 'Low' THEN 1 ELSE 0 END) as low
                FROM news_articles 
                WHERE DATE(published_date) >= DATE('now', '-{} days')
                  AND status != 'Archived'
                GROUP BY DATE(published_date)
                ORDER BY date ASC
            """.format(days)).fetchall()
            
            # Risk category distribution
            category_distribution = conn.execute("""
                SELECT primary_risk_category, COUNT(*) as count,
                       AVG(overall_risk_score) as avg_score
                FROM news_articles 
                WHERE DATE(published_date) >= DATE('now', '-{} days')
                  AND status != 'Archived'
                GROUP BY primary_risk_category
                ORDER BY count DESC
            """.format(days)).fetchall()
            
            return {
                "risk_trend": [
                    {
                        "date": row["calculation_date"],
                        "score": row["overall_risk_score"],
                        "trend": row["risk_trend"]
                    } for row in risk_trend
                ],
                "news_volume": [
                    {
                        "date": row["date"],
                        "total": row["total"],
                        "by_severity": {
                            "critical": row["critical"],
                            "high": row["high"],
                            "medium": row["medium"],
                            "low": row["low"]
                        }
                    } for row in news_volume
                ],
                "category_distribution": [
                    {
                        "category": row["primary_risk_category"],
                        "count": row["count"],
                        "avg_score": round(row["avg_score"], 1) if row["avg_score"] else 0
                    } for row in category_distribution
                ]
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error7 (get_trend_analytics): {str(e)}")

# ==========================================
# VIEW-BASED ENDPOINTS (OPTIMIZED QUERIES)
# ==========================================

@app.get("/api/dashboard/trending-topics")
async def get_trending_topics():
    """Get trending topics using optimized view"""
    try:
        with get_risk_db_connection() as conn:
            rows = conn.execute("SELECT * FROM dashboard_trending_topics").fetchall()
            
            topics = []
            for row in rows:
                topics.append({
                    "keyword": row["keyword"],
                    "frequency": row["frequency"],
                    "avg_impact_score": row["avg_impact_score"],
                    "latest_mention": row["latest_mention"],
                    "recent_mentions": row["recent_mentions"],
                    "avg_risk_level": row["avg_risk_level"],
                    "trend_velocity": round(row["recent_mentions"] / max(row["frequency"], 1) * 100, 1)
                })
            
            return {
                "trending_topics": topics,
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error8 (get_trending_topics): {str(e)}")

@app.get("/api/dashboard/risk-breakdown")
async def get_risk_breakdown():
    """Get risk category breakdown using optimized view"""
    try:
        with get_risk_db_connection() as conn:
            rows = conn.execute("SELECT * FROM dashboard_risk_breakdown").fetchall()
            
            breakdown = []
            for row in rows:
                breakdown.append({
                    "category": row["primary_risk_category"],
                    "news_count": row["news_count"],
                    "percentage": row["percentage"],
                    "chart_color": row["chart_color"]
                })
            
            return {
                "risk_breakdown": breakdown,
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error9 (get_risk_breakdown): {str(e)}")

@app.get("/api/dashboard/geographic-risk")
async def get_geographic_risk(limit: int = Query(20, ge=1, le=50)):
    """Get geographic risk distribution using optimized view"""
    try:
        with get_risk_db_connection() as conn:
            rows = conn.execute("SELECT * FROM dashboard_geographic_risk LIMIT ?", [limit]).fetchall()
            
            geographic_data = []
            for row in rows:
                geographic_data.append({
                    "country": row["primary_country"],
                    "region": row["region"],
                    "coordinates": json.loads(row["coordinates"]) if row["coordinates"] else None,
                    "news_count": row["news_count"],
                    "risk_weight": row["risk_weight"],
                    # Total exposure removed as requested
                    "avg_sentiment": row["avg_sentiment"],
                    "latest_news_date": row["latest_news_date"]
                })
            
            return {
                "geographic_risk": geographic_data,
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error10 (get_geographic_risk): {str(e)}")

@app.get("/api/dashboard/summary")
async def get_dashboard_only_summary():
    """Get basic dashboard summary using optimized view"""
    try:
        with get_risk_db_connection() as conn:
            row = conn.execute("SELECT * FROM dashboard_summary").fetchone()
            
            if not row:
                return {
                    "summary": None,
                    "message": "No data available for today",
                    "generated_at": datetime.now().isoformat()
                }
            
            return {
                "summary": {
                    "total_news_today": row["total_news_today"],
                    "critical_count": row["critical_count"],
                    "high_count": row["high_count"],
                    "avg_sentiment": row["avg_sentiment"],
                    # Total exposure removed as requested
                    "current_risk_score": row["current_risk_score"]
                },
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error11 (get_dashboard_only_summary): {str(e)}")

# ==========================================
# THEME-BASED ANALYTICS ENDPOINTS
# ==========================================

@app.get("/api/themes/statistics")
async def get_theme_statistics():
    """
    Get financial risk theme distribution and statistics.
    Returns article counts by theme for dashboard bar chart.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT 
                    primary_theme,
                    theme_display_name,
                    COUNT(*) as article_count,
                    AVG(theme_confidence) as avg_confidence,
                    AVG(overall_risk_score) as avg_risk_score,
                    COUNT(CASE WHEN severity_level = 'Critical' THEN 1 END) as critical_count,
                    COUNT(CASE WHEN is_market_moving = 1 THEN 1 END) as market_moving_count
                FROM news_articles 
                WHERE primary_theme IS NOT NULL 
                    AND sentiment_score < 0  -- Only negative news
                    AND processed_date >= datetime('now', '-7 days')  -- Last 7 days
                GROUP BY primary_theme, theme_display_name
                ORDER BY article_count DESC
            """)
            
            themes = []
            for row in cursor.fetchall():
                themes.append({
                    "theme_id": row["primary_theme"],
                    "theme_name": row["theme_display_name"],
                    "article_count": row["article_count"],
                    "avg_confidence": round(row["avg_confidence"] or 0, 1),
                    "avg_risk_score": round(row["avg_risk_score"] or 0, 1),
                    "critical_count": row["critical_count"],
                    "market_moving_count": row["market_moving_count"]
                })
            
            return {
                "themes": themes,
                "total_themes": len(themes),
                "total_articles": sum(theme["article_count"] for theme in themes),
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error (theme_statistics): {str(e)}")


@app.get("/api/themes/{theme_id}/articles")
async def get_theme_articles(
    theme_id: str,
    limit: int = Query(50, ge=1, le=200, description="Number of articles to return")
):
    """
    Get articles for a specific theme.
    Used for storyline generation and detailed analysis.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT 
                    id, headline, content, summary, source_name, published_date,
                    primary_risk_category, secondary_risk_categories,
                    severity_level, confidence_score, sentiment_score, overall_risk_score,
                    theme_confidence, theme_keywords, countries, affected_markets,
                    financial_exposure, is_market_moving, description
                FROM news_articles 
                WHERE primary_theme = ?
                    AND sentiment_score < 0  -- Only negative news
                    AND processed_date >= datetime('now', '-14 days')  -- Last 14 days
                ORDER BY processed_date DESC, overall_risk_score DESC
                LIMIT ?
            """, [theme_id, limit])
            
            articles = []
            for row in cursor.fetchall():
                articles.append({
                    "id": row["id"],
                    "headline": row["headline"],
                    "content": row["content"],
                    "summary": row["summary"],
                    "source_name": row["source_name"],
                    "published_date": row["published_date"],
                    "primary_risk_category": row["primary_risk_category"],
                    "secondary_risk_categories": json.loads(row["secondary_risk_categories"] or "[]"),
                    "severity_level": row["severity_level"],
                    "confidence_score": row["confidence_score"],
                    "sentiment_score": row["sentiment_score"],
                    "overall_risk_score": row["overall_risk_score"],
                    "theme_confidence": row["theme_confidence"],
                    "theme_keywords": json.loads(row["theme_keywords"] or "[]"),
                    "countries": json.loads(row["countries"] or "[]"),
                    "affected_markets": json.loads(row["affected_markets"] or "[]"),
                    "financial_exposure": row["financial_exposure"],
                    "is_market_moving": bool(row["is_market_moving"]),
                    "description": row["description"]
                })
            
            # Get theme info
            theme_cursor = conn.execute("""
                SELECT theme_display_name 
                FROM news_articles 
                WHERE primary_theme = ? 
                LIMIT 1
            """, [theme_id])
            
            theme_info = theme_cursor.fetchone()
            theme_name = theme_info["theme_display_name"] if theme_info else theme_id
            
            return {
                "theme_id": theme_id,
                "theme_name": theme_name,
                "articles": articles,
                "article_count": len(articles),
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error (theme_articles): {str(e)}")


@app.post("/api/themes/{theme_id}/storyline")
async def generate_theme_storyline(
    theme_id: str,
    max_articles: int = Query(50, ge=10, le=500, description="Maximum articles to analyze"),
    days_back: int = Query(30, ge=1, le=90, description="Days to look back for articles")
):
    """
    Generate a comprehensive risk storyline for a specific theme using enhanced LLM analysis.
    Handles large article volumes with intelligent selection and creates detailed banking impact analysis.
    """
    try:
        # Import enhanced storyline generation utilities
        from enhanced_storyline_generator import (
            smart_article_selection,
            create_storyline_context,
            generate_comprehensive_storyline_prompt,
            create_downloadable_report_data
        )
        
        # First, get ALL articles for this theme (not limited)
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT 
                    id, headline, content, summary, description, source_name,
                    countries, affected_markets, financial_exposure, 
                    severity_level, overall_risk_score, confidence_score,
                    published_date, processed_date, theme_display_name,
                    theme_confidence, theme_keywords, primary_risk_category,
                    secondary_risk_categories, is_market_moving, is_breaking_news
                FROM news_articles 
                WHERE primary_theme = ?
                    AND sentiment_score < 0  -- Only negative news
                    AND processed_date >= datetime('now', '-{} days')
                ORDER BY overall_risk_score DESC, published_date DESC
            """.format(days_back), [theme_id])
            
            all_articles = cursor.fetchall()
            
            if not all_articles:
                raise HTTPException(status_code=404, detail=f"No articles found for theme: {theme_id}")
            
            # Convert rows to dictionaries for easier handling
            articles_data = []
            for row in all_articles:
                article_dict = dict(row)
                # Parse JSON fields safely
                if article_dict.get("countries"):
                    try:
                        article_dict["countries"] = json.loads(article_dict["countries"])
                    except:
                        article_dict["countries"] = []
                
                if article_dict.get("affected_markets"):
                    try:
                        article_dict["affected_markets"] = json.loads(article_dict["affected_markets"])
                    except:
                        article_dict["affected_markets"] = []
                
                if article_dict.get("theme_keywords"):
                    try:
                        article_dict["theme_keywords"] = json.loads(article_dict["theme_keywords"])
                    except:
                        article_dict["theme_keywords"] = []
                
                articles_data.append(article_dict)
            
            theme_name = articles_data[0]["theme_display_name"]
            
            print(f"🎯 Found {len(articles_data)} articles for theme: {theme_name}")
            
            # Use smart selection if we have too many articles
            if len(articles_data) > max_articles:
                selected_articles = smart_article_selection(articles_data, max_articles)
                print(f"📊 Selected {len(selected_articles)} most representative articles")
            else:
                selected_articles = articles_data
            
            # Create comprehensive context for storyline
            context = create_storyline_context(selected_articles, theme_name)
            
            # Generate enhanced LLM prompt
            storyline_prompt = generate_comprehensive_storyline_prompt(context, selected_articles)
            
            print(f"🤖 Generating comprehensive storyline using LLM...")
            
            # Generate storyline using LLM
            from util import llm_call
            
            storyline_response = llm_call(
                messages=[{"role": "user", "content": storyline_prompt}],
                model="gpt-4o-mini",
                temperature=0.1
            )
            
            storyline = storyline_response.strip()
            
            # Create downloadable report data
            report_data = create_downloadable_report_data(storyline, context, selected_articles)
            
            # Store storyline in database for caching
            with get_db_connection() as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO risk_storylines 
                    (theme_id, theme_name, storyline, article_count, 
                     affected_countries, affected_markets, generated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, [
                    theme_id, theme_name, storyline, len(selected_articles),
                    json.dumps(context['geographic_scope']['countries'][:20]), 
                    json.dumps(context['market_scope']['markets'][:20]),
                    datetime.now().isoformat()
                ])
                conn.commit()
            
            return {
                "theme_id": theme_id,
                "theme_name": theme_name,
                "storyline": storyline,
                "context": context,
                "report_data": report_data,
                "metadata": {
                    "articles_analyzed": len(articles_data),
                    "articles_selected": len(selected_articles),
                    "affected_countries": context['geographic_scope']['countries'][:10],
                    "affected_markets": context['market_scope']['markets'][:10],
                    "severity_distribution": context['severity_distribution'],
                    "avg_risk_score": context['avg_risk_score'],
                    "generation_date": datetime.now().isoformat()
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storyline generation error: {str(e)}")


@app.get("/api/storylines")
async def get_recent_storylines():
    """
    Get recently generated storylines.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT 
                    theme_id, theme_name, storyline, article_count, 
                    affected_countries, affected_markets, generated_at
                FROM risk_storylines 
                ORDER BY generated_at DESC
                LIMIT 10
            """)
            
            storylines = []
            for row in cursor.fetchall():
                storylines.append({
                    "theme_id": row["theme_id"],
                    "theme_name": row["theme_name"],
                    "storyline": row["storyline"],
                    "article_count": row["article_count"],
                    "affected_countries": json.loads(row["affected_countries"] or "[]"),
                    "affected_markets": json.loads(row["affected_markets"] or "[]"),
                    "generated_at": row["generated_at"]
                })
            
            return {
                "storylines": storylines,
                "count": len(storylines),
                "generated_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error (storylines): {str(e)}")

# ==========================================
# SERVER-SENT EVENTS (SSE) ENDPOINTS
# ==========================================

import asyncio
import json

@app.get("/api/stream/dashboard")
async def stream_dashboard_updates():
    """
    Unified SSE endpoint for all dashboard widget updates
    
    Emits targeted events for:
    - risk_score_update: Overall risk score changes
    - alerts_update: New critical alerts
    - sentiment_update: Sentiment distribution changes
    - heatmap_update: Geographic risk heatmap data
    - trending_topics_update: Trending topics changes
    - news_feed_update: New news articles
    - risk_breakdown_update: Risk category breakdown changes
    - dashboard_summary_update: General dashboard metrics
    """
    
    async def dashboard_event_generator():
        last_checks = {
            'news': datetime.now(),
            'risk_calculations': datetime.now(),
            'trending_topics': datetime.now(),
            'geographic': datetime.now()
        }
        
        # Send initial connection event
        yield {
            "event": "connection",
            "data": json.dumps({
                "status": "connected",
                "timestamp": datetime.now().isoformat(),
                "message": "Dashboard SSE stream connected"
            })
        }
        
        while True:
            try:
                with get_risk_db_connection() as conn:
                    current_time = datetime.now()
                    
                    # Check for new news articles
                    new_news = conn.execute("""
                        SELECT COUNT(*) as count FROM news_articles 
                        WHERE processed_date > ? AND status != 'Archived'
                    """, [last_checks['news'].isoformat()]).fetchone()
                    
                    if new_news['count'] > 0:
                        # Get latest news for news feed update
                        latest_news = conn.execute("""
                            SELECT * FROM recent_news_feed LIMIT 5
                        """).fetchall()
                        
                        news_data = []
                        for row in latest_news:
                            news_data.append({
                                "id": row["id"],
                                "headline": row["headline"],
                                "summary": row["summary"],
                                "source_name": row["source_name"],
                                "published_date": row["published_date"],
                                "severity_level": row["severity_level"],
                                "primary_risk_category": row["primary_risk_category"],
                                "sentiment_score": row["sentiment_score"],
                                # Financial exposure removed as requested
                                "is_breaking_news": bool(row["is_breaking_news"]),
                                "risk_color": row["risk_color"],
                                "minutes_ago": row["minutes_ago"]
                            })
                        
                        yield {
                            "event": "news_feed_update",
                            "data": json.dumps({
                                "articles": news_data,
                                "timestamp": current_time.isoformat(),
                                "new_count": new_news['count']
                            })
                        }
                        
                        # Update dashboard summary due to new news
                        dashboard_summary = conn.execute("SELECT * FROM dashboard_summary").fetchone()
                        if dashboard_summary:
                            yield {
                                "event": "dashboard_summary_update",
                                "data": json.dumps({
                                    "total_news_today": dashboard_summary["total_news_today"],
                                    "critical_count": dashboard_summary["critical_count"],
                                    "high_count": dashboard_summary["high_count"],
                                    "avg_sentiment": dashboard_summary["avg_sentiment"],
                                    # Total exposure removed as requested
                                    "current_risk_score": dashboard_summary["current_risk_score"],
                                    "timestamp": current_time.isoformat()
                                })
                            }
                        
                        # Update sentiment analysis
                        sentiment_data = conn.execute("""
                            SELECT 
                                ROUND(AVG(CASE WHEN sentiment_score > 0.1 THEN 1.0 ELSE 0.0 END) * 100, 1) as positive_pct,
                                ROUND(AVG(CASE WHEN sentiment_score BETWEEN -0.1 AND 0.1 THEN 1.0 ELSE 0.0 END) * 100, 1) as neutral_pct,
                                ROUND(AVG(CASE WHEN sentiment_score < -0.1 THEN 1.0 ELSE 0.0 END) * 100, 1) as negative_pct
                            FROM news_articles 
                            WHERE DATE(published_date) = DATE('now') AND status != 'Archived'
                        """).fetchone()
                        
                        if sentiment_data:
                            yield {
                                "event": "sentiment_update",
                                "data": json.dumps({
                                    "positive_pct": sentiment_data["positive_pct"] or 0,
                                    "neutral_pct": sentiment_data["neutral_pct"] or 0,
                                    "negative_pct": sentiment_data["negative_pct"] or 0,
                                    "timestamp": current_time.isoformat()
                                })
                            }
                        
                        # Update risk breakdown
                        risk_breakdown = conn.execute("SELECT * FROM dashboard_risk_breakdown").fetchall()
                        breakdown_data = []
                        for row in risk_breakdown:
                            breakdown_data.append({
                                "category": row["primary_risk_category"],
                                "news_count": row["news_count"],
                                "percentage": row["percentage"],
                                "chart_color": row["chart_color"]
                            })
                        
                        yield {
                            "event": "risk_breakdown_update",
                            "data": json.dumps({
                                "breakdown": breakdown_data,
                                "timestamp": current_time.isoformat()
                            })
                        }
                        
                        last_checks['news'] = current_time
                    
                    # Check for new risk calculations
                    new_risk_calc = conn.execute("""
                        SELECT COUNT(*) as count FROM risk_calculations 
                        WHERE created_at > ?
                    """, [last_checks['risk_calculations'].isoformat()]).fetchone()
                    
                    if new_risk_calc['count'] > 0:
                        # Get latest risk calculation
                        latest_risk = conn.execute("""
                            SELECT * FROM risk_calculations 
                            ORDER BY calculation_date DESC LIMIT 1
                        """).fetchone()
                        
                        if latest_risk:
                            yield {
                                "event": "risk_score_update",
                                "data": json.dumps({
                                    "overall_risk_score": latest_risk["overall_risk_score"],
                                    "risk_trend": latest_risk["risk_trend"],
                                    "calculation_date": latest_risk["calculation_date"],
                                    "contributing_factors": json.loads(latest_risk["contributing_factors"]) if latest_risk["contributing_factors"] else [],
                                    "timestamp": current_time.isoformat()
                                })
                            }
                        
                        last_checks['risk_calculations'] = current_time
                    
                    # Check for trending topics changes (every 30 seconds)
                    if (current_time - last_checks['trending_topics']).total_seconds() >= 30:
                        trending_topics = conn.execute("SELECT * FROM dashboard_trending_topics LIMIT 10").fetchall()
                        topics_data = []
                        for row in trending_topics:
                            topics_data.append({
                                "keyword": row["keyword"],
                                "frequency": row["frequency"],
                                "avg_impact_score": row["avg_impact_score"],
                                "latest_mention": row["latest_mention"],
                                "recent_mentions": row["recent_mentions"],
                                "avg_risk_level": row["avg_risk_level"]
                            })
                        
                        yield {
                            "event": "trending_topics_update",
                            "data": json.dumps({
                                "topics": topics_data,
                                "timestamp": current_time.isoformat()
                            })
                        }
                        
                        last_checks['trending_topics'] = current_time
                    
                    # Check for geographic risk updates (every 60 seconds)
                    if (current_time - last_checks['geographic']).total_seconds() >= 60:
                        geographic_risk = conn.execute("SELECT * FROM dashboard_geographic_risk LIMIT 15").fetchall()
                        geo_data = []
                        for row in geographic_risk:
                            geo_data.append({
                                "country": row["primary_country"],
                                "region": row["region"],
                                "coordinates": json.loads(row["coordinates"]) if row["coordinates"] else None,
                                "news_count": row["news_count"],
                                "risk_weight": row["risk_weight"],
                                # Total exposure removed as requested
                                "avg_sentiment": row["avg_sentiment"],
                                "latest_news_date": row["latest_news_date"]
                            })
                        
                        yield {
                            "event": "heatmap_update",
                            "data": json.dumps({
                                "geographic_data": geo_data,
                                "timestamp": current_time.isoformat()
                            })
                        }
                        
                        last_checks['geographic'] = current_time
                    
                    # Check for critical alerts
                    critical_alerts = conn.execute("""
                        SELECT COUNT(*) as count FROM news_articles 
                        WHERE severity_level = 'Critical' 
                        AND DATE(published_date) = DATE('now')
                        AND status != 'Archived'
                    """).fetchone()
                    
                    # Send alerts update periodically
                    yield {
                        "event": "alerts_update",
                        "data": json.dumps({
                            "critical_count": critical_alerts["count"],
                            "last_check": current_time.isoformat(),
                            "timestamp": current_time.isoformat()
                        })
                    }
                
            except Exception as e:
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    })
                }
            
            # Wait 5 seconds before next check
            await asyncio.sleep(5)
    
    return EventSourceResponse(dashboard_event_generator())

@app.get("/api/stream/news")
async def stream_news_updates():
    """Legacy SSE endpoint for news updates only (for backward compatibility)"""
    
    async def news_event_generator():
        last_check = datetime.now()
        
        while True:
            try:
                with get_risk_db_connection() as conn:
                    # Check for new news since last check
                    new_articles = conn.execute("""
                        SELECT * FROM recent_news_feed 
                        WHERE processed_date > ?
                        ORDER BY published_date DESC 
                        LIMIT 10
                    """, [last_check.isoformat()]).fetchall()
                    
                    for row in new_articles:
                        article_data = {
                            "id": row["id"],
                            "headline": row["headline"],
                            "summary": row["summary"],
                            "source_name": row["source_name"],
                            "published_date": row["published_date"],
                            "severity_level": row["severity_level"],
                            "primary_risk_category": row["primary_risk_category"],
                            "sentiment_score": row["sentiment_score"],
                            # Financial exposure removed as requested
                            "is_breaking_news": bool(row["is_breaking_news"]),
                            "risk_color": row["risk_color"],
                            "minutes_ago": row["minutes_ago"]
                        }
                        
                        yield {
                            "event": "news_update",
                            "data": json.dumps(article_data)
                        }
                    
                    last_check = datetime.now()
                
            except Exception as e:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)})
                }
            
            await asyncio.sleep(10)
    
    return EventSourceResponse(news_event_generator())

@app.get("/api/stream/risk")
async def stream_risk_updates():
    """Legacy SSE endpoint for risk calculation updates (for backward compatibility)"""
    
    async def risk_event_generator():
        last_check = datetime.now()
        
        while True:
            try:
                with get_risk_db_connection() as conn:
                    # Check for new risk calculations
                    new_calculations = conn.execute("""
                        SELECT * FROM risk_calculations 
                        WHERE created_at > ?
                        ORDER BY calculation_date DESC 
                        LIMIT 5
                    """, [last_check.isoformat()]).fetchall()
                    
                    for row in new_calculations:
                        calc_data = {
                            "id": row["calc_id"],
                            "calculation_date": row["calculation_date"],
                            "overall_risk_score": row["overall_risk_score"],
                            "total_financial_exposure": row["total_financial_exposure"],
                            "risk_trend": row["risk_trend"],
                            "contributing_factors": json.loads(row["contributing_factors"]) if row["contributing_factors"] else []
                        }
                        
                        yield {
                            "event": "risk_calculation_update",
                            "data": json.dumps(calc_data)
                        }
                    
                    last_check = datetime.now()
                
            except Exception as e:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)})
                }
            
            await asyncio.sleep(15)
    
    return EventSourceResponse(risk_event_generator())

# ==========================================
# HEALTH CHECK ENDPOINT
# ==========================================

@app.get("/api/health")
async def health_check():
    """API health check endpoint"""
    try:
        with get_risk_db_connection() as risk_conn:
            # Test risk database connection
            risk_conn.execute("SELECT 1").fetchone()
            
        with get_knowledge_db_connection() as knowledge_conn:
            # Test knowledge database connection
            knowledge_conn.execute("SELECT 1").fetchone()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "databases": {
                "risk_db": "connected",
                "knowledge_db": "connected"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=503, 
            detail=f"Service unavailable: {str(e)}"
        )

# ==========================================
# ROOT ENDPOINT
# ==========================================

@app.get("/")
async def root():
    """API root endpoint with documentation links"""
    return {
        "message": "Risk Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "endpoints": {
            "news": "/api/news/latest",
            "dashboard": "/api/risk/dashboard",
            "risk_calculations": "/api/risk/calculations",
            "analytics": "/api/analytics/trends",
            "stream_dashboard": "/api/stream/dashboard",
            "stream_news": "/api/stream/news",
            "stream_risk": "/api/stream/risk",
            "health": "/api/health"
        },
        "sse_events": {
            "dashboard_stream": {
                "endpoint": "/api/stream/dashboard",
                "events": [
                    "connection",
                    "news_feed_update",
                    "dashboard_summary_update", 
                    "sentiment_update",
                    "risk_breakdown_update",
                    "risk_score_update",
                    "trending_topics_update",
                    "heatmap_update",
                    "alerts_update",
                    "error"
                ]
            }
        }
    }

@app.get("/api/themes/{theme_id}/storyline/download")
async def download_storyline_report(theme_id: str):
    """
    Download storyline report in HTML format.
    """
    try:
        from enhanced_storyline_generator import create_downloadable_report_data
        
        # Get the most recent storyline for this theme
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT 
                    theme_id, theme_name, storyline, article_count, 
                    affected_countries, affected_markets, generated_at
                FROM risk_storylines 
                WHERE theme_id = ?
                ORDER BY generated_at DESC
                LIMIT 1
            """, [theme_id])
            
            storyline_row = cursor.fetchone()
            if not storyline_row:
                raise HTTPException(status_code=404, detail=f"No storyline found for theme: {theme_id}")
            
            # Get related articles for the report
            cursor = conn.execute("""
                SELECT 
                    id, headline, content, summary, source_name,
                    countries, affected_markets, financial_exposure, 
                    severity_level, overall_risk_score, published_date
                FROM news_articles 
                WHERE primary_theme = ?
                    AND sentiment_score < 0
                ORDER BY overall_risk_score DESC
                LIMIT 25
            """, [theme_id])
            
            articles = []
            for row in cursor.fetchall():
                article_dict = dict(row)
                # Parse JSON fields
                if article_dict.get("countries"):
                    try:
                        article_dict["countries"] = json.loads(article_dict["countries"])
                    except:
                        article_dict["countries"] = []
                
                if article_dict.get("affected_markets"):
                    try:
                        article_dict["affected_markets"] = json.loads(article_dict["affected_markets"])
                    except:
                        article_dict["affected_markets"] = []
                
                articles.append(article_dict)
        
        # Create report context
        context = {
            "theme_name": storyline_row["theme_name"],
            "article_count": storyline_row["article_count"],
            "date_range": {
                "start": min(a.get("published_date", "") for a in articles) if articles else "",
                "end": max(a.get("published_date", "") for a in articles) if articles else ""
            },
            "geographic_scope": {
                "countries": json.loads(storyline_row["affected_countries"] or "[]"),
                "country_count": len(json.loads(storyline_row["affected_countries"] or "[]")),
                "cross_country_events": {}
            },
            "market_scope": {
                "markets": json.loads(storyline_row["affected_markets"] or "[]"),
                "market_count": len(json.loads(storyline_row["affected_markets"] or "[]")),
                "cross_market_events": {}
            },
            "severity_distribution": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
            "avg_risk_score": sum(a.get("overall_risk_score", 0) for a in articles) / len(articles) if articles else 0,
            "max_risk_score": max(a.get("overall_risk_score", 0) for a in articles) if articles else 0,
            "timeline": []
        }
        
        # Count severity levels
        for article in articles:
            severity = article.get("severity_level", "Low")
            if severity in context["severity_distribution"]:
                context["severity_distribution"][severity] += 1
        
        # Create comprehensive report data
        report_data = create_downloadable_report_data(
            storyline_row["storyline"], 
            context, 
            articles
        )
          # Generate HTML report
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Banking Risk Impact Assessment: {report_data['report_metadata']['title']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ border-bottom: 2px solid #333; padding-bottom: 20px; }}
                .section {{ margin: 30px 0; }}
                .metrics {{ background: #f5f5f5; padding: 15px; border-radius: 5px; }}
                .article {{ border-left: 3px solid #007acc; padding-left: 15px; margin: 10px 0; }}
                .critical {{ border-left-color: #d32f2f; }}
                .high {{ border-left-color: #f57c00; }}
                .medium {{ border-left-color: #fbc02d; }}
                .low {{ border-left-color: #388e3c; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Banking Risk Impact Assessment: {report_data['report_metadata']['title']}</h1>
                <p><strong>Report ID:</strong> {report_data['report_metadata']['report_id']}</p>
                <p><strong>Generated:</strong> {report_data['report_metadata']['generated_at']}</p>
                <p><strong>Classification:</strong> {report_data['report_metadata']['classification']}</p>
            </div>
            
            <div class="section">
                <h2>Executive Summary</h2>
                <div class="metrics">
                    <p><strong>Theme:</strong> {report_data['executive_summary']['theme']}</p>
                    <p><strong>Articles Analyzed:</strong> {report_data['executive_summary']['article_count']}</p>
                    <p><strong>Geographic Scope:</strong> {report_data['executive_summary']['geographic_scope']} countries</p>
                    <p><strong>Average Risk Score:</strong> {report_data['executive_summary']['avg_risk_score']:.1f}/10</p>
                </div>
            </div>
            
            <div class="section">
                <h2>Risk Impact Assessment</h2>
                <div style="white-space: pre-line; line-height: 1.6;">
                    {report_data['storyline_content']}
                </div>
            </div>
            
            <div class="section">
                <h2>Key Article References</h2>
                {"".join([f'''
                <div class="article {article['severity'].lower()}">
                    <h4>{article['headline']}</h4>
                    <p><strong>Date:</strong> {article['date']} | <strong>Severity:</strong> {article['severity']} | <strong>Risk Score:</strong> {article['risk_score']:.1f}</p>
                    <p><strong>Source:</strong> {article['source']}</p>
                </div>
                ''' for article in report_data['article_references'][:10]])}
            </div>
        </body>
        </html>
        """
            
        from fastapi.responses import HTMLResponse
        return HTMLResponse(
            content=html_content,
            headers={
                "Content-Disposition": f"attachment; filename=risk_impact_assessment_{theme_id}_{datetime.now().strftime('%Y%m%d')}.html"
            }
        )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")
