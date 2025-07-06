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
- GET /api/dashboard/risk-breakdown - Get risk breakdown by category (optimized view)
- GET /api/dashboard/summary - Get basic dashboard summary (optimized view)
- GET /api/stream/news - SSE stream for real-time news updates
- GET /api/stream/risk - SSE stream for real-time risk updates
"""

import hashlib
import json
import os
import asyncio
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import contextmanager
import sqlite3
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv
from sse_event_system import (
    SSEEventManager, 
    emit_connection_event, 
    emit_error_event, 
    emit_news_feed_update, 
    emit_dashboard_summary_update, 
    emit_risk_breakdown_update, 
    emit_alerts_update, 
    emit_risk_score_update
)

# Load environment variables
load_dotenv()

# Configuration
RISK_DB = os.getenv('RISK_DB', 'risk_dashboard.db')
KNOWLEDGE_DB = os.getenv('KNOWLEDGE_DB', 'risk_dashboard.db')

app = FastAPI(
    title="Risk Dashboard API",
    description="REST API for Banking Risk Dashboard with SSE streaming",
    version="1.0.0",
    debug=True  # Enable debug mode to show detailed error tracebacks
)

# Global exception handler to catch and log all unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to catch and log all unhandled exceptions"""
    error_traceback = traceback.format_exc()
    error_message = f"Internal server error: {str(exc)}"
    
    print(f"❌ UNHANDLED EXCEPTION in {request.method} {request.url}")
    print(f"Exception: {exc}")
    print(f"Full traceback:\n{error_traceback}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": error_message,
            "traceback": error_traceback if app.debug else None,
            "path": str(request.url),
            "method": request.method
        }
    )

# Global change detection cache
_change_detection_cache = {
    'dashboard_summary': None,
    'risk_breakdown': None, 
    'news_feed': None,
    'alerts': None
}

def get_data_hash(data: Any) -> str:
    """Generate hash for change detection"""
    if isinstance(data, dict):
        # Remove timestamp fields for hash calculation
        filtered_data = {k: v for k, v in data.items() if k not in ['timestamp', 'last_check', 'triggered_by_event']}
        return hashlib.md5(json.dumps(filtered_data, sort_keys=True).encode()).hexdigest()
    elif isinstance(data, list):
        # For lists, sort and hash
        return hashlib.md5(json.dumps(sorted(data, key=str), sort_keys=True).encode()).hexdigest()
    else:
        return hashlib.md5(str(data).encode()).hexdigest()

def should_emit_update(update_type: str, data: Any) -> bool:
    """Check if update should be emitted based on change detection"""
    current_hash = get_data_hash(data)
    last_hash = _change_detection_cache.get(update_type)
    
    if current_hash != last_hash:
        _change_detection_cache[update_type] = current_hash
        return True
    return False

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
        "source_url": row["source_url"],
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
        "primary_theme": row["primary_theme"],
        "theme_display_name": row["theme_display_name"],
        "theme_confidence": row["theme_confidence"],
        "theme_keywords": safe_json_loads("theme_keywords", row["theme_keywords"]),
        "historical_impact_analysis": row["historical_impact_analysis"],
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

def time_window_to_datetime_clause(time_window: str = "today", from_date: str = None, to_date: str = None) -> str:
    """Convert time window string to SQLite datetime clause"""
    if time_window == "custom" and from_date and to_date:
        return f"published_date >= '{from_date}' AND published_date <= '{to_date} 23:59:59'"
    elif time_window == "custom" and from_date:
        return f"published_date >= '{from_date}'"
    elif time_window == "custom" and to_date:
        return f"published_date <= '{to_date} 23:59:59'"
    
    # Handle special cases first
    if time_window == "today":
        return f"published_date >= datetime((SELECT MAX(published_date) FROM news_articles WHERE status != 'Archived'), 'start of day')"
    elif time_window == "yesterday":
        return f"published_date >= datetime((SELECT MAX(published_date) FROM news_articles WHERE status != 'Archived'), '-1 day', 'start of day') AND published_date < datetime((SELECT MAX(published_date) FROM news_articles WHERE status != 'Archived'), 'start of day')"
    
    # Map time windows to SQLite modifiers
    window_map = {
        "1h": "'-1 hour'",
        "4h": "'-4 hours'",
        "8h": "'-8 hours'", 
        "12h": "'-12 hours'",
        "3d": "'-3 days'",
        "7d": "'-7 days'",
        "14d": "'-14 days'",
        "1m": "'-30 days'",
        "3m": "'-90 days'",
        "6m": "'-180 days'"
    }
    
    modifier = window_map.get(time_window, "'-1 day'")  # Default to today
    return f"published_date >= datetime((SELECT MAX(published_date) FROM news_articles WHERE status != 'Archived'), {modifier})"

def get_time_window_description(time_window: str = "today", from_date: str = None, to_date: str = None) -> str:
    """Get human readable description of time window"""
    if time_window == "custom":
        if from_date and to_date:
            return f"from {from_date} to {to_date}"
        elif from_date:
            return f"from {from_date}"
        elif to_date:
            return f"until {to_date}"
        else:
            return "custom range"
    
    descriptions = {
        "1h": "last hour",
        "4h": "last 4 hours",
        "8h": "last 8 hours",
        "12h": "last 12 hours",
        "today": "today (midnight to now)",
        "yesterday": "yesterday (full day)",
        "3d": "last 3 days",
        "7d": "last 7 days",
        "14d": "last 14 days",
        "1m": "last month (30 days)",
        "3m": "last 3 months (90 days)",
        "6m": "last 6 months (180 days)"
    }
    return descriptions.get(time_window, "today")

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
    is_breaking: Optional[bool] = Query(None),
    time_window: str = Query("today", description="Time window for news filtering (1h, 4h, 8h, 12h, today, yesterday, 3d, 7d, 14d, 1m, 3m, 6m)")
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
            
            # Time window condition
            time_window_clause = time_window_to_datetime_clause(time_window)
            where_conditions.append(time_window_clause)
            
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
async def get_recent_news_feed(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    time_window: str = Query("today", regex="^(1h|4h|8h|12h|today|yesterday|3d|7d|14d|1m|3m|6m|custom)$"),
    from_date: str = Query(None, regex="^[0-9]{4}-[0-9]{2}-[0-9]{2}$"),
    to_date: str = Query(None, regex="^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
):
    """Get recent news feed using time window - simplified data for dashboard sidebar"""
    try:
        with get_risk_db_connection() as conn:
            # Build time window clause
            time_clause = time_window_to_datetime_clause(time_window, from_date, to_date)
            
            # Get total count first
            count_query = f"""
                SELECT COUNT(*) 
                FROM news_articles 
                WHERE status != 'Archived'
                  AND {time_clause}
            """
            
            total_count = conn.execute(count_query).fetchone()[0]
            
            # Query the main news_articles table to get all required fields for the news feed
            query = f"""
                SELECT 
                    id, headline, content, summary, source_name, source_url, published_date, 
                    severity_level, primary_risk_category, sentiment_score,
                    is_breaking_news, risk_color, countries, industry_sectors,
                    overall_risk_score, confidence_score, is_trending, 
                    is_market_moving, requires_action, keywords, entities,
                    primary_theme, theme_display_name, theme_confidence, theme_keywords,
                    impact_score, temporal_impact, urgency_level, is_regulatory,
                    historical_impact_analysis,
                    ROUND((JULIANDAY('now') - JULIANDAY(published_date)) * 24 * 60) as minutes_ago
                FROM news_articles 
                WHERE status != 'Archived'
                  AND {time_clause}
                ORDER BY published_date DESC 
                LIMIT ? OFFSET ?
            """
            
            rows = conn.execute(query, [limit, offset]).fetchall()
            
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
                    "content": row["content"],
                    "summary": row["summary"],
                    "source_name": row["source_name"],
                    "source_url": row["source_url"],
                    "published_date": row["published_date"],
                    "severity_level": row["severity_level"],
                    "primary_risk_category": row["primary_risk_category"],
                    "sentiment_score": row["sentiment_score"],
                    "overall_risk_score": row["overall_risk_score"],
                    "confidence_score": row["confidence_score"] or 0,
                    "impact_score": row["impact_score"] or 0,
                    "temporal_impact": row["temporal_impact"] or "Medium-term",
                    "urgency_level": row["urgency_level"] or "Low",
                    "countries": safe_json_loads(row["countries"], []),
                    "industry_sectors": safe_json_loads(row["industry_sectors"], []),
                    "keywords": safe_json_loads(row["keywords"], []),
                    "entities": safe_json_loads(row["entities"], []),
                    "is_breaking_news": bool(row["is_breaking_news"]),
                    "is_trending": bool(row["is_trending"]),
                    "is_market_moving": bool(row["is_market_moving"]),
                    "is_regulatory": bool(row["is_regulatory"]),
                    "requires_action": bool(row["requires_action"]),
                    "risk_color": row["risk_color"],
                    "primary_theme": row["primary_theme"],
                    "theme_display_name": row["theme_display_name"],
                    "theme_confidence": row["theme_confidence"],
                    "theme_keywords": safe_json_loads(row["theme_keywords"], []),
                    "historical_impact_analysis": row["historical_impact_analysis"],
                    "minutes_ago": int(row["minutes_ago"]) if row["minutes_ago"] else 0
                })
            
            return {
                "articles": articles,
                "count": len(articles),
                "total_count": total_count,
                "has_more": offset + limit < total_count,
                "time_window": time_window,
                "time_window_description": get_time_window_description(time_window, from_date, to_date),
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
async def get_dashboard_summary(
    time_window: str = Query("today", regex="^(1h|4h|8h|12h|today|yesterday|3d|7d|14d|1m|3m|6m|custom)$"),
    from_date: str = Query(None, regex="^[0-9]{4}-[0-9]{2}-[0-9]{2}$"),
    to_date: str = Query(None, regex="^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
):
    """Get dashboard summary data using time window for dynamic filtering"""
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
            # Build time window clause
            time_clause = time_window_to_datetime_clause(time_window, from_date, to_date)
            
            print(f"DEBUG: Fetching dashboard data for time window: {time_window}")
            print(f"DEBUG: Time clause: {time_clause}")
            
            # Overall Risk Score - use latest calculation
            risk_calc = conn.execute("""
                SELECT overall_risk_score, risk_trend
                FROM risk_calculations 
                ORDER BY created_at DESC 
                LIMIT 1
            """).fetchone()
            
            # Count metrics for the time window
            counts_query = f"""
                SELECT 
                    COUNT(*) as total_news,
                    SUM(CASE WHEN severity_level = 'Critical' THEN 1 ELSE 0 END) as critical_count,
                    SUM(CASE WHEN severity_level = 'High' THEN 1 ELSE 0 END) as high_count,
                    SUM(CASE WHEN severity_level = 'Medium' THEN 1 ELSE 0 END) as medium_count,
                    SUM(CASE WHEN severity_level = 'Low' THEN 1 ELSE 0 END) as low_count,
                    SUM(CASE WHEN severity_level IN ('Critical', 'High') THEN 1 ELSE 0 END) as critical_alerts,
                    AVG(sentiment_score) as avg_sentiment,
                    MAX(overall_risk_score) as current_risk_score
                FROM news_articles 
                WHERE status != 'Archived'
                  AND {time_clause}
            """
            counts_data = conn.execute(counts_query).fetchone()
            
            # Sentiment analysis for the time window
            sentiment_query = f"""
                SELECT 
                    COUNT(CASE WHEN sentiment_score > 0.1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as positive_pct,
                    COUNT(CASE WHEN sentiment_score BETWEEN -0.1 AND 0.1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as neutral_pct,
                    COUNT(CASE WHEN sentiment_score < -0.1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as negative_pct
                FROM news_articles 
                WHERE status != 'Archived'
                  AND {time_clause}
            """
            sentiment_data = conn.execute(sentiment_query).fetchone()
            
            # Trending topics for the time window
            trending_query = f"""
                SELECT
                    LOWER(keywords.value) as keyword,
                    COUNT(*) as frequency,
                    AVG(CASE WHEN impact_score IS NOT NULL THEN impact_score ELSE 75.0 END) as avg_impact_score,
                    MAX(published_date) as latest_mention,
                    COUNT(CASE WHEN published_date >= (
                        SELECT datetime(MAX(published_date), '-10 days') 
                        FROM news_articles 
                        WHERE status != 'Archived'
                    ) THEN 1 END) as recent_mentions,
                    AVG(CASE
                        WHEN severity_level = 'Critical' THEN 4.0
                        WHEN severity_level = 'High' THEN 3.0
                        WHEN severity_level = 'Medium' THEN 2.0
                        WHEN severity_level = 'Low' THEN 1.0
                        ELSE 2.0
                    END) as avg_risk_level
                FROM news_articles, json_each(keywords) as keywords
                WHERE status != 'Archived'
                  AND {time_clause}
                  AND keywords IS NOT NULL
                  AND json_valid(keywords) = 1
                  AND keywords.value IS NOT NULL
                  AND LENGTH(TRIM(keywords.value)) > 2
                GROUP BY LOWER(keywords.value)
                HAVING frequency >= 1
                ORDER BY frequency DESC, recent_mentions DESC
                LIMIT 15
            """
            trending_topics = conn.execute(trending_query).fetchall()
            
            # Risk breakdown by category for the time window
            risk_breakdown_query = f"""
                SELECT 
                    primary_risk_category,
                    COUNT(*) as news_count,
                    ROUND(COUNT(*) * 100.0 / (
                        SELECT COUNT(*) 
                        FROM news_articles
                        WHERE status != 'Archived'
                        AND published_date >= datetime('now', '-7 days')
                        AND primary_risk_category IS NOT NULL
                    ), 1) as percentage,
                    CASE primary_risk_category
                        WHEN 'market_risk' THEN '#3B82F6'
                        WHEN 'credit_risk' THEN '#EF4444'
                        WHEN 'operational_risk' THEN '#F59E0B'
                        WHEN 'liquidity_risk' THEN '#10B981'
                        ELSE '#6B7280'
                    END as chart_color
                FROM news_articles
                WHERE status != 'Archived'
                  AND {time_clause}
                  AND primary_risk_category IS NOT NULL
                GROUP BY primary_risk_category
                ORDER BY news_count DESC
            """
            risk_breakdown = conn.execute(risk_breakdown_query).fetchall()
            
            # Geographic risk for the time window
            geographic_query = f"""
                SELECT 
                    json_extract(countries, '$[0]') as primary_country,
                    json_extract(geographic_regions, '$[0]') as region,
                    coordinates,
                    COUNT(*) as news_count,
                    SUM(CASE WHEN severity_level = 'Critical' THEN 4 
                             WHEN severity_level = 'High' THEN 3 
                             WHEN severity_level = 'Medium' THEN 2 
                             WHEN severity_level = 'Low' THEN 1 
                             ELSE 0 END) as risk_weight,
                    AVG(sentiment_score) as avg_sentiment,
                    MAX(published_date) as latest_news_date
                FROM news_articles 
                WHERE status != 'Archived'
                  AND {time_clause}
                  AND countries IS NOT NULL 
                  AND json_extract(countries, '$[0]') IS NOT NULL
                GROUP BY json_extract(countries, '$[0]'), json_extract(geographic_regions, '$[0]'), coordinates
                HAVING news_count > 0
                ORDER BY risk_weight DESC
                LIMIT 10
            """
            geographic_risk = conn.execute(geographic_query).fetchall()
            
            print("DEBUG: Building response...")
            # Format the response
            result = {
                "dashboard_summary": {
                    "overall_risk_score": risk_calc["overall_risk_score"] if risk_calc else 0.0,
                    "risk_trend": risk_calc["risk_trend"] if risk_calc else "Stable",
                    "critical_alerts": counts_data["critical_alerts"] or 0,
                    "total_news_filtered": counts_data["total_news"] or 0,
                    "critical_count": counts_data["critical_count"] or 0,
                    "high_count": counts_data["high_count"] or 0,
                    "medium_count": counts_data["medium_count"] or 0,
                    "low_count": counts_data["low_count"] or 0,
                    "avg_sentiment": counts_data["avg_sentiment"] or 0.0,
                    "current_risk_score": counts_data["current_risk_score"] or 0.0
                },
                "sentiment_analysis": {
                    "positive_pct": round(sentiment_data["positive_pct"] or 0.0, 1),
                    "neutral_pct": round(sentiment_data["neutral_pct"] or 0.0, 1),
                    "negative_pct": round(sentiment_data["negative_pct"] or 0.0, 1)
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
                        "avg_sentiment": row["avg_sentiment"],
                        "latest_news_date": row["latest_news_date"]
                    } for row in geographic_risk
                ],
                "time_window": time_window,
                "time_window_description": get_time_window_description(time_window, from_date, to_date),
                "generated_at": datetime.now().isoformat()
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
                    "total_news_filtered": row["total_news_today"],
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
                    AND processed_date >= datetime((SELECT MAX(published_date) FROM news_articles), '-15 days')  -- Last 15 days from max published date
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
                    AND processed_date >= datetime((SELECT MAX(published_date) FROM news_articles), '-15 days')  -- Last 15 days from max published date
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
    days_back: int = Query(30, ge=1, le=90, description="Days to look back for articles"),
    force_regenerate: bool = Query(True, description="Force regeneration instead of using cache")
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
            
            # Check for cached storyline (only if not forcing regeneration)
            if not force_regenerate:
                print("🔍 Checking for cached storyline...")
                cached_cursor = conn.execute("""
                    SELECT storyline, generated_at, article_count
                    FROM risk_storylines 
                    WHERE theme_id = ? 
                        AND generated_at >= datetime('now', '-1 day')
                    ORDER BY generated_at DESC 
                    LIMIT 1
                """, [theme_id])
                
                cached_result = cached_cursor.fetchone()
                if cached_result:
                    cached_article_count = cached_result[2]
                    current_article_count = len(articles_data)
                    
                    # Check if significant new articles have arrived (>20% increase or >5 new articles)
                    article_increase = current_article_count - cached_article_count
                    article_increase_pct = (article_increase / max(cached_article_count, 1)) * 100
                    
                    # Check how old the cache is
                    cache_age_hours = (datetime.now() - datetime.fromisoformat(cached_result[1])).total_seconds() / 3600
                    
                    if article_increase_pct < 20 and article_increase < 5 and cache_age_hours < 6:
                        print(f"📦 Using cached storyline from {cached_result[1]} (articles: {cached_article_count} vs {current_article_count})")
                        return {
                            "theme_id": theme_id,
                            "theme_name": theme_name,
                            "storyline": cached_result[0],
                            "context": {"cached": True, "generated_at": cached_result[1]},
                            "metadata": {
                                "cached": True,
                                "articles_analyzed": len(articles_data),
                                "cached_article_count": cached_result[2],
                                "new_articles_since_cache": article_increase,
                                "cache_age_hours": round(cache_age_hours, 1),
                                "generation_date": cached_result[1]
                            }
                        }
                    else:
                        print(f"🔄 Cache stale: {article_increase} new articles ({article_increase_pct:.1f}% increase), {cache_age_hours:.1f}h old")
            else:
                print("🔄 Force regenerating storyline (cache bypassed)")
            
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
    Redesigned Event-driven SSE endpoint using flexible envelope pattern
    
    Uses the new SSEEventManager to handle all backend event types while
    respecting database constraints. Maps rich backend events to 4 database-allowed
    envelope types and preserves original event semantics in JSON payload.
    
    Supported Events (All Backend Events):
    - news_update, news_feed_update → news_update envelope
    - risk_update, risk_score_update, risk_breakdown_update → risk_change envelope  
    - alerts_update, alert_new, error → alert_new envelope
    - dashboard_summary_update, connection → dashboard_refresh envelope
    """
    
    async def dashboard_event_generator():
        last_event_id = 0
        
        # Send initial connection event using new system
        emit_connection_event(
            status="connected",
            message="Dashboard SSE stream connected with flexible event system",
            last_event_id=last_event_id
        )
        
        # Track periodic update timers and last values
        last_periodic_checks = {
            'alerts': datetime.now()
        }
        last_alert_state = {
            'critical_count': None,
            'last_emitted': None
        }
        
        while True:
            try:
                current_time = datetime.now()
                
                # 1. Get events using new flexible event manager
                new_events = SSEEventManager.get_events_since(last_event_id, limit=50)
                
                for event in new_events:
                    # Extract event details from the flexible system
                    event_id = event['event_id']
                    envelope_type = event['envelope_type']  # DB constraint type
                    original_event_type = event['original_event_type']  # Backend type
                    event_data = event['event_data']
                    priority = event['priority']
                    timestamp = event['timestamp']
                    
                    # Always yield the original event type for frontend compatibility
                    enriched_event_data = {
                        "event_id": event_id,
                        "event_type": original_event_type,  # Frontend gets original type
                        "envelope_type": envelope_type,     # For debugging
                        "event_data": event_data,
                        "priority": priority,
                        "timestamp": timestamp
                    }
                    
                    yield f"event: {original_event_type}\ndata: {json.dumps(enriched_event_data)}\n\n"
                    
                    # Handle cascading updates based on original event type
                    await handle_cascading_updates(original_event_type, event_data, event_id)
                    
                    # Update last processed event ID
                    last_event_id = event_id
                
                # Mark processed events (cleanup)
                if new_events:
                    processed_ids = [event['event_id'] for event in new_events]
                    SSEEventManager.mark_events_processed(processed_ids)
                
                # 2. Periodic updates for non-event-driven data
                await handle_periodic_updates(current_time, last_periodic_checks, last_alert_state)
                
            except Exception as e:
                # Use new error event system
                emit_error_event(
                    error=str(e),
                    context="dashboard_stream_generator"
                )
                
                # Also yield directly for immediate frontend feedback
                error_data = json.dumps({
                    "error": str(e),
                    "context": "dashboard_stream_generator", 
                    "timestamp": datetime.now().isoformat()
                })
                yield f"event: error\ndata: {error_data}\n\n"
            
            # Wait 10 seconds before next check (good demo pace)
            await asyncio.sleep(10)
    
    async def handle_cascading_updates(original_event_type: str, event_data: Dict, trigger_event_id: int):
        """Handle cascading updates based on original event type"""
        try:
            with get_risk_db_connection() as conn:
                current_time = datetime.now()
                
                if original_event_type == 'news_update':
                    # Cascade 1: Update news feed
                    latest_news = conn.execute("""
                        SELECT * FROM news_articles 
                        WHERE status != 'Archived'
                        ORDER BY display_priority DESC, published_date DESC 
                        LIMIT 5
                    """).fetchall()
                    
                    news_data = []
                    for row in latest_news:
                        try:
                            formatted_article = format_news_article(row)
                            minutes_ago = conn.execute("""
                                SELECT CAST((julianday('now') - julianday(?)) * 24 * 60 AS INTEGER) as minutes_ago
                            """, [row["published_date"]]).fetchone()["minutes_ago"]
                            formatted_article["minutes_ago"] = minutes_ago
                            news_data.append(formatted_article)
                        except Exception as format_error:
                            # Safe way to get ID from sqlite3.Row
                            try:
                                article_id = row["id"] if "id" in row.keys() else "unknown"
                            except (KeyError, TypeError):
                                article_id = "unknown"
                            print(f"⚠️ Error formatting article {article_id}: {format_error}")
                            # Create a minimal article object for safety
                            def safe_row_get(row, key, default=None):
                                try:
                                    return row[key] if key in row.keys() else default
                                except (KeyError, TypeError):
                                    return default
                                    
                            news_data.append({
                                "id": safe_row_get(row, "id", 0),
                                "headline": safe_row_get(row, "headline", "Unknown"),
                                "source_name": safe_row_get(row, "source_name", "Unknown"),
                                "published_date": safe_row_get(row, "published_date", ""),
                                "severity_level": safe_row_get(row, "severity_level", "Low"),
                                "primary_risk_category": safe_row_get(row, "primary_risk_category", "Unknown"),
                                "minutes_ago": 0
                            })
                    
                    # Emit news feed update only if data changed
                    if should_emit_update('news_feed', news_data):
                        emit_news_feed_update(
                            articles=news_data,
                            triggered_by_event=trigger_event_id
                        )
                        print(f"📰 News feed updated: {len(news_data)} articles (content changed)")
                    
                    # Cascade 2: Update dashboard summary (use dynamic calculation for 24h window)
                    try:
                        # Use 7-day time window for SSE updates (captures more articles for testing)
                        dashboard_counts = conn.execute("""
                            SELECT 
                                COUNT(*) as total_news_today,
                                SUM(CASE WHEN severity_level = 'Critical' THEN 1 ELSE 0 END) as critical_count,
                                SUM(CASE WHEN severity_level = 'High' THEN 1 ELSE 0 END) as high_count,
                                SUM(CASE WHEN severity_level = 'Medium' THEN 1 ELSE 0 END) as medium_count,
                                SUM(CASE WHEN severity_level = 'Low' THEN 1 ELSE 0 END) as low_count,
                                AVG(sentiment_score) as avg_sentiment,
                                MAX(overall_risk_score) as current_risk_score
                            FROM news_articles 
                            WHERE status != 'Archived'
                            AND published_date >= datetime('now', '-7 days')
                        """).fetchone()
                        
                        if dashboard_counts:
                            dashboard_data = {
                                "total_news_filtered": dashboard_counts["total_news_today"] or 0,
                                "critical_count": dashboard_counts["critical_count"] or 0,
                                "high_count": dashboard_counts["high_count"] or 0,
                                "medium_count": dashboard_counts["medium_count"] or 0,
                                "low_count": dashboard_counts["low_count"] or 0,
                                "avg_sentiment": dashboard_counts["avg_sentiment"] or 0.0,
                                "current_risk_score": dashboard_counts["current_risk_score"] or 0.0
                            }
                            
                            if should_emit_update('dashboard_summary', dashboard_data):
                                emit_dashboard_summary_update(**dashboard_data)
                                print(f"📊 Dashboard summary updated: {dashboard_counts['total_news_today']} articles, {dashboard_counts['medium_count']} medium (content changed)")
                        
                    except Exception as summary_error:
                        print(f"⚠️ Error calculating dashboard summary: {summary_error}")
                    
                    # Cascade 3: Update risk breakdown (use dynamic calculation for 24h window)
                    try:
                        risk_breakdown = conn.execute("""
                            SELECT 
                                primary_risk_category,
                                COUNT(*) as news_count,
                                ROUND(COUNT(*) * 100.0 / (
                                    SELECT COUNT(*) 
                                    FROM news_articles
                                    WHERE status != 'Archived'
                                    AND published_date >= datetime('now', '-7 days')
                                    AND primary_risk_category IS NOT NULL
                                ), 1) as percentage,
                                CASE primary_risk_category
                                    WHEN 'market_risk' THEN '#3B82F6'
                                    WHEN 'credit_risk' THEN '#EF4444'
                                    WHEN 'operational_risk' THEN '#F59E0B'
                                    WHEN 'liquidity_risk' THEN '#10B981'
                                    ELSE '#6B7280'
                                END as chart_color
                            FROM news_articles
                            WHERE status != 'Archived'
                            AND published_date >= datetime('now', '-7 days')
                            AND primary_risk_category IS NOT NULL
                            GROUP BY primary_risk_category
                            ORDER BY news_count DESC
                        """).fetchall()
                        
                        breakdown_data = []
                        for row in risk_breakdown:
                            breakdown_data.append({
                                "category": row["primary_risk_category"],
                                "news_count": row["news_count"],
                                "percentage": row["percentage"],
                                "chart_color": row["chart_color"]
                            })
                        
                        if breakdown_data:  # Only emit if we have valid data
                            if should_emit_update('risk_breakdown', breakdown_data):
                                emit_risk_breakdown_update(breakdown=breakdown_data)
                                print(f"📊 Risk breakdown updated: {len(breakdown_data)} categories (content changed)")
                            
                    except Exception as breakdown_error:
                        print(f"⚠️ Error calculating risk breakdown: {breakdown_error}")
                
                elif original_event_type in ['risk_update', 'risk_score_update']:
                    # Get latest risk calculation
                    latest_risk = conn.execute("""
                        SELECT * FROM risk_calculations 
                        ORDER BY calculation_date DESC LIMIT 1
                    """).fetchone()
                    
                    if latest_risk:
                        emit_risk_score_update(
                            overall_risk_score=latest_risk["overall_risk_score"],
                            risk_trend=latest_risk["risk_trend"],
                            calculation_date=latest_risk["calculation_date"],
                            contributing_factors=json.loads(latest_risk["contributing_factors"]) if latest_risk["contributing_factors"] else []
                        )
                        
        except Exception as e:
            emit_error_event(
                error=f"Cascading update failed: {str(e)}",
                context=f"original_event_type: {original_event_type}"
            )
    
    async def handle_periodic_updates(current_time: datetime, last_checks: Dict, last_alert_state: Dict):
        """Handle periodic updates for non-event-driven data"""
        try:
            with get_risk_db_connection() as conn:
                
                # Critical alerts (only emit if changed or after 5 minutes)
                critical_alerts = conn.execute("""
                    SELECT COUNT(*) as count FROM news_articles 
                    WHERE severity_level = 'Critical' 
                    AND DATE(published_date) = DATE('now')
                    AND status != 'Archived'
                """).fetchone()
                
                current_critical_count = critical_alerts["count"]
                should_emit_alert = False
                
                # Check if critical count has changed
                if last_alert_state['critical_count'] != current_critical_count:
                    should_emit_alert = True
                    print(f"🔔 Critical count changed: {last_alert_state['critical_count']} → {current_critical_count}")
                
                # Or if it's been more than 2 minutes since last emission
                elif (last_alert_state['last_emitted'] is None or 
                      (current_time - last_alert_state['last_emitted']).total_seconds() > 120):
                    should_emit_alert = True
                    print(f"⏰ Alert update due to time interval (2 minutes)")
                
                if should_emit_alert:
                    alert_data = {
                        "critical_count": current_critical_count,
                        "last_check": current_time.isoformat()
                    }
                    
                    if should_emit_update('alerts', alert_data):
                        emit_alerts_update(**alert_data)
                        print(f"🔔 Alerts updated: {current_critical_count} critical (content changed)")
                    
                    # Update tracking state
                    last_alert_state['critical_count'] = current_critical_count
                    last_alert_state['last_emitted'] = current_time
                
        except Exception as e:
            emit_error_event(
                error=f"Periodic update failed: {str(e)}",
                context="periodic_updates"
            )
    
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
                        
                        news_data = json.dumps(article_data)
                        yield f"event: news_update\ndata: {news_data}\n\n"
                    
                    last_check = datetime.now()
                
            except Exception as e:
                error_data = json.dumps({"error": str(e)})
                yield f"event: error\ndata: {error_data}\n\n"
            
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
                        
                        calc_update_data = json.dumps(calc_data)
                        yield f"event: risk_calculation_update\ndata: {calc_update_data}\n\n"
                    
                    last_check = datetime.now()
                
            except Exception as e:
                risk_error_data = json.dumps({"error": str(e)})
                yield f"event: error\ndata: {risk_error_data}\n\n"
            
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
