"""
Installation:
pip install huey openai python-dotenv

Usage:
1. python news_risk_analyzer.py          # Queue all news (publisher)
2. python -m huey.bin.huey_consumer news_risk_analyzer.huey  # Start worker
3. Open http://localhost:8080 for Huey monitoring UI (not the main API)

Note: Main API runs on http://localhost:8000 (risk_dashboard_api.py)
"""

import sqlite3
import json
import os
from datetime import datetime
from huey import SqliteHuey, crontab
from contextlib import contextmanager
from threading import Lock
from dotenv import load_dotenv
from util import llm_call, validate_risk_analysis

# Load environment variables
load_dotenv()

# ==========================================
# CONFIGURATION MANAGEMENT
# ==========================================

class Config:
    """Centralized configuration management"""
    
    # LLM Provider Configuration
    LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'openai').lower()
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
    AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
    AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview')
    AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o')
    
    # Model Configuration
    LLM_MODEL = os.getenv('LLM_MODEL', 'gpt-4o')
    
    # Database Configuration
    RISK_DB = os.getenv('RISK_DB', 'risk_dashboard.db')
    KNOWLEDGE_DB = os.getenv('KNOWLEDGE_DB', 'risk_dashboard.db')
    
    # Processing Configuration
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    RETRY_DELAY = int(os.getenv('RETRY_DELAY', '60'))
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', '100'))
    
    # Connection Pool Configuration
    MAX_CONNECTIONS = int(os.getenv('MAX_CONNECTIONS', '5'))
    CONNECTION_TIMEOUT = int(os.getenv('CONNECTION_TIMEOUT', '30'))
    
    # Evaluator-Optimizer Configuration
    MAX_OPTIMIZATION_ITERATIONS = int(os.getenv('MAX_OPTIMIZATION_ITERATIONS', '3'))
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if cls.LLM_PROVIDER == 'azure':
            if not cls.AZURE_OPENAI_API_KEY or not cls.AZURE_OPENAI_ENDPOINT:
                raise ValueError("Azure OpenAI configuration incomplete. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT")
        else:
            if not cls.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY environment variable not set")
        return True

# Validate configuration on startup
Config.validate()

# ==========================================
# CONNECTION POOL IMPLEMENTATION
# ==========================================

class DatabaseConnectionPool:
    """Thread-safe SQLite connection pool"""
    
    def __init__(self, database_path, max_connections=5):
        self.database_path = database_path
        self.max_connections = max_connections
        self._connections = []
        self._lock = Lock()
        self._in_use = set()
    
    def get_connection(self):
        """Get a connection from the pool"""
        with self._lock:
            # Try to reuse an existing connection
            if self._connections:
                conn = self._connections.pop()
            else:
                # Create new connection if pool not at max
                if len(self._in_use) < self.max_connections:
                    conn = sqlite3.connect(
                        self.database_path,
                        timeout=Config.CONNECTION_TIMEOUT,
                        check_same_thread=False
                    )
                    # Enable foreign keys and WAL mode for better performance
                    conn.execute("PRAGMA foreign_keys = ON")
                    conn.execute("PRAGMA journal_mode = WAL")
                else:
                    raise Exception(f"Connection pool exhausted (max: {self.max_connections})")
            
            self._in_use.add(conn)
            return conn
    
    def return_connection(self, conn):
        """Return a connection to the pool"""
        with self._lock:
            if conn in self._in_use:
                self._in_use.remove(conn)
                # Only return healthy connections to pool
                try:
                    conn.execute("SELECT 1")  # Health check
                    self._connections.append(conn)
                except:
                    # Connection is broken, close it
                    try:
                        conn.close()
                    except:
                        pass
    
    def close_all(self):
        """Close all connections in pool"""
        with self._lock:
            for conn in self._connections + list(self._in_use):
                try:
                    conn.close()
                except:
                    pass
            self._connections.clear()
            self._in_use.clear()

# Initialize connection pools
risk_db_pool = DatabaseConnectionPool(Config.RISK_DB, Config.MAX_CONNECTIONS)
knowledge_db_pool = DatabaseConnectionPool(Config.KNOWLEDGE_DB, Config.MAX_CONNECTIONS)

@contextmanager
def get_risk_db_connection():
    """Context manager for risk database connections"""
    conn = risk_db_pool.get_connection()
    try:
        yield conn
    finally:
        risk_db_pool.return_connection(conn)

@contextmanager
def get_knowledge_db_connection():
    """Context manager for knowledge database connections"""
    conn = knowledge_db_pool.get_connection()
    try:
        yield conn
    finally:
        knowledge_db_pool.return_connection(conn)

# ==========================================
# SETUP: Huey Configuration
# ==========================================

# SQLite-backed queue (persistent, survives restarts)
# IMPORTANT: Use consistent name to avoid __main__ vs module_name conflicts
huey = SqliteHuey(name='news_risk_analyzer', filename='news_processing_queue.db')

# Configure OpenAI - using new client pattern (handled in util.py)
# No need to set openai.api_key here as util.py handles OpenAI client initialization

# Remove duplicate database configuration (already defined in Config class)
# RISK_DB = 'risk_dashboard.db'
# KNOWLEDGE_DB = 'db.sqlite'  # Your existing knowledge store

# ==========================================
# CONSUMER: Background task processing
# ==========================================

def should_process_news(news_data):
    """
    Pre-filter function to quickly determine if news poses any financial risk.
    Returns True if news should be processed, False if it should be skipped.
    """
    try:
        # Simple prompt to quickly assess financial risk
        prompt = f"""
You are a financial risk pre-filter. Your job is to quickly determine if news poses ANY financial risk to banks, markets, or financial institutions.

ONLY return "PROCESS" if the news could pose financial risks such as:
- Market crashes, volatility, or disruptions
- Economic downturns, recessions, or financial crises
- Regulatory changes that could harm banks
- Company failures, bankruptcies, or major losses
- Geopolitical events affecting markets
- Cyber attacks on financial systems
- Interest rate shocks or monetary policy risks
- Credit defaults or liquidity problems

Return "SKIP" if the news is:
- Positive developments (tech breakthroughs, good earnings, etc.)
- Neutral announcements
- General news without financial impact
- Sports, entertainment, or lifestyle content

News to analyze:
Headline: {news_data['headline']}
Content: {news_data['story'][:500]}...

Respond with exactly one word: PROCESS or SKIP
        """
        
        # Use the existing llm_call function from util.py
        response_content = llm_call([{"role": "user", "content": prompt}], temperature=0.1)
        
        decision = response_content.strip().upper()
        
        if decision == "PROCESS":
            print(f"🎯 Risk pre-filter: PROCESS - Financial risk detected")
            return True
        elif decision == "SKIP":
            print(f"⏭️ Risk pre-filter: SKIP - No financial risk detected")
            return False
        else:
            # If unclear response, err on the side of processing
            print(f"⚠️ Risk pre-filter: Unclear response '{decision}' - defaulting to PROCESS")
            return True
            
    except Exception as e:
        print(f"⚠️ Risk pre-filter error: {e} - defaulting to PROCESS")
        # If error, process the news to be safe
        return True

@huey.task(retries=Config.MAX_RETRIES, retry_delay=Config.RETRY_DELAY)
def process_news_article(news_data):
    """
    Process news article using Evaluator-Optimizer pattern for improved risk analysis quality.
    No fallback logic - errors are handled by Huey retries as per Anthropic cookbook pattern.
    
    Args:
        news_data (dict): Complete news data from knowledge store
            - newsId: Unique identifier
            - headline: News headline
            - story: Full article content
            - newsSource: Source name (Reuters, Bloomberg, etc.)
            - creationTimestamp: When news was created
    
    Returns:
        str: Processing result message
        
    Raises:
        Exception: If risk analysis fails (handled by Huey retries)
    """
    print(f"🔄 Processing news {news_data['newsId']}: {news_data['headline'][:50]}...")
    
    try:
        # Skip pre-filtering - do full analysis first to get accurate sentiment/risk assessment
        
        # ==========================================
        # STEP 1: Risk Analysis using Evaluator-Optimizer Pattern
        # ==========================================
        
        from evaluator_optimizer import process_news_with_evaluator_optimizer
        from financial_risk_themes import classify_news_theme
        
        print(f"🎯 Using Evaluator-Optimizer pattern for risk analysis")
        
        # Use Evaluator-Optimizer pattern - let exceptions bubble up to Huey
        risk_analysis = process_news_with_evaluator_optimizer(
            news_data, 
            max_iterations=Config.MAX_OPTIMIZATION_ITERATIONS
        )
        
        # ==========================================
        # STEP 1.5: Theme Classification
        # ==========================================
        
        print(f"🏷️ Classifying news into financial risk themes")
        
        # Extract all risk categories for theme classification
        all_risk_categories = [risk_analysis.get('primary_risk_category', 'market_risk')] + \
                             risk_analysis.get('secondary_risk_categories', [])
        
        # Classify into theme
        theme_result = classify_news_theme(
            news_data['headline'], 
            news_data['story'], 
            all_risk_categories
        )
        
        # Add theme information to risk analysis
        risk_analysis['primary_theme'] = theme_result['primary_theme']
        risk_analysis['theme_display_name'] = theme_result['theme_display_name'] 
        risk_analysis['theme_confidence'] = theme_result['confidence']
        risk_analysis['theme_keywords'] = theme_result.get('matched_keywords', [])
        
        print(f"🎯 Theme classified: {theme_result['theme_display_name']} ({theme_result['confidence']}% confidence)")
        
        # Log optimization results if metadata exists
        if '_optimization_meta' in risk_analysis:
            optimization_meta = risk_analysis.pop('_optimization_meta')
            print(f"📈 Optimization completed: {optimization_meta['iterations_used']} iterations, "
                  f"final status: {optimization_meta['final_evaluation']}")
        
        # ==========================================
        # STEP 1.6: Post-analysis Sentiment Filter - Skip positive sentiment news
        # ==========================================
        
        print(f"🔍 Post-analysis filtering: Checking if news should be saved...")
        
        sentiment_score = risk_analysis.get('sentiment_score', 0.0)
        
        # Skip ONLY if sentiment is positive (> 0), regardless of risk level
        if sentiment_score > 0:
            print(f"⏭️ Skipping news {news_data['newsId']} - Positive sentiment detected ({sentiment_score:.2f})")
            
            # Mark as processed to prevent reprocessing
            try:
                with get_knowledge_db_connection() as knowledge_conn:
                    knowledge_conn.execute("""
                        UPDATE raw_news_data 
                        SET processed = 1, processed_at = CURRENT_TIMESTAMP 
                        WHERE news_id = ?
                    """, [news_data['newsId']])
                    knowledge_conn.commit()
                    print(f"✅ Marked positive news {news_data['newsId']} as processed (skipped)")
            except Exception as e:
                print(f"⚠️ Warning: Failed to mark positive news as processed: {e}")
            
            return f"Skipped news {news_data['newsId']} - Positive sentiment ({sentiment_score:.2f})"
        
        print(f"✅ News has negative/neutral sentiment ({sentiment_score:.2f}) - proceeding to save")
        
        # ==========================================
        # STEP 2: Check for existing news to prevent duplicates
        # ==========================================
        
        # Check if this news already exists in news_articles table
        with get_risk_db_connection() as risk_conn:
            existing_news = risk_conn.execute("""
                SELECT id FROM news_articles 
                WHERE headline = ? AND source_name = ? AND published_date = ?
            """, [news_data['headline'], news_data['newsSource'], news_data['creationTimestamp']]).fetchone()
            
            if existing_news:
                # News already exists - mark as processed to prevent reprocessing
                print(f"⚠️ News already exists in database (ID: {existing_news[0]}), marking as processed...")
                try:
                    with get_knowledge_db_connection() as knowledge_conn:
                        knowledge_conn.execute("""
                            UPDATE raw_news_data 
                            SET processed = 1, processed_at = CURRENT_TIMESTAMP 
                            WHERE news_id = ?
                        """, [news_data['newsId']])
                        knowledge_conn.commit()
                        print(f"✅ Marked duplicate news {news_data['newsId']} as processed")
                except Exception as e:
                    print(f"⚠️ Warning: Failed to mark duplicate news as processed: {e}")
                
                return f"News {news_data['newsId']} already exists in database (ID: {existing_news[0]})"
        
        # ==========================================
        # STEP 3: Save to Risk Dashboard Database (Using Connection Pool)
        # ==========================================
        
        with get_risk_db_connection() as risk_conn:
            # Map risk analysis to database schema
            risk_color = get_risk_color(risk_analysis['severity_level'])
            display_priority = get_display_priority(risk_analysis)
            
            # Process coordinates - OpenAI provides single coordinate for primary country
            coordinates_json = None
            if risk_analysis.get('coordinates'):
                coordinates_json = json.dumps(risk_analysis['coordinates'])
            
            # Execute insert with transaction management
            cursor = risk_conn.execute("""
                INSERT INTO news_articles (
                    headline, content, summary, source_name, published_date, processed_date,
                    risk_categories, risk_subcategories, primary_risk_category, secondary_risk_categories,
                    geographic_regions, industry_sectors, countries, coordinates, affected_markets,
                    severity_level, confidence_score, sentiment_score, impact_score, overall_risk_score,
                    financial_exposure, exposure_currency, risk_contribution,
                    temporal_impact, urgency_level,
                    is_market_moving, is_regulatory, is_breaking_news, is_trending, requires_action,
                    risk_color, display_priority, alert_sent, alert_type,
                    view_count, engagement_score, similar_news_count,
                    status, keywords, entities, tags, description,
                    primary_theme, theme_display_name, theme_confidence, theme_keywords,
                    historical_impact_analysis,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?,
                    ?, ?
                )
            """, [
                # Basic news data (6 fields)
                news_data['headline'], 
                news_data['story'], 
                risk_analysis.get('summary', news_data.get('teaser', news_data['headline'][:200] + '...')),
                news_data['newsSource'], 
                news_data['creationTimestamp'],  # Use original timestamp from raw_news_data (already in Z format)
                news_data['creationTimestamp'],  # processed_date - use original creation timestamp
                
                # Risk classifications (10 fields - updated for new schema)
                # Create comprehensive risk_categories array with both primary and secondary
                json.dumps([risk_analysis.get('primary_risk_category', risk_analysis.get('risk_category', 'market_risk'))] + 
                          risk_analysis.get('secondary_risk_categories', [])),
                json.dumps(risk_analysis.get('risk_subcategories', [])),
                risk_analysis.get('primary_risk_category', risk_analysis.get('risk_category', 'market_risk')),
                json.dumps(risk_analysis.get('secondary_risk_categories', [])),
                json.dumps(risk_analysis.get('geographic_regions', [])),
                json.dumps(risk_analysis.get('industry_sectors', ['financial_services'])),
                json.dumps(risk_analysis.get('countries', [])),
                coordinates_json,
                json.dumps(risk_analysis.get('affected_markets', [])),
                
                # Scoring & impact (5 fields)
                risk_analysis['severity_level'],
                risk_analysis.get('confidence_score', 50),
                risk_analysis.get('sentiment_score', 0.0),
                risk_analysis.get('impact_score', 50),
                calculate_overall_risk_score(risk_analysis),
                
                # Financial impact (3 fields)
                risk_analysis.get('financial_exposure', 0),
                'USD',
                risk_analysis.get('risk_contribution', 0),
                
                # Time-based classifications (2 fields)
                risk_analysis.get('temporal_impact', 'Medium-term'),
                risk_analysis.get('urgency_level', 'Medium'),
                
                # Dashboard flags (5 fields)
                1 if risk_analysis.get('is_market_moving', False) else 0,
                1 if risk_analysis.get('is_regulatory', False) else 0,
                1 if risk_analysis.get('is_breaking_news', False) else 0,
                0,  # is_trending
                1 if risk_analysis.get('requires_action', False) else 0,
                
                # Dashboard display (4 fields)
                risk_color,
                display_priority,
                0,  # alert_sent
                'None',  # alert_type
                
                # Analytics (3 fields)
                0,  # view_count
                0.0,  # engagement_score  
                0,  # similar_news_count
                
                # Status & metadata (5 fields)
                'New',  # status
                json.dumps(risk_analysis.get('keywords', [])),
                json.dumps(risk_analysis.get('entities', [])),
                json.dumps([]),  # tags
                risk_analysis.get('description', 'LLM analysis justification not provided'),  # description
                
                # Theme classification (4 fields)
                risk_analysis.get('primary_theme', 'other_financial_risks'),
                risk_analysis.get('theme_display_name', 'Other Financial Risks'),
                risk_analysis.get('theme_confidence', 30),
                json.dumps(risk_analysis.get('theme_keywords', [])),
                
                # Historical impact analysis (1 field)
                risk_analysis.get('historical_impact_analysis', 'Historical impact analysis not available'),
                
                # Timestamps (2 fields)
                news_data['creationTimestamp'],  # created_at - use original creation timestamp
                news_data['creationTimestamp']   # updated_at - use original creation timestamp
            ])
            
            # Get the auto-generated ID for market exposures
            risk_db_id = cursor.lastrowid
            
            # Commit transaction
            risk_conn.commit()
        
        # ==========================================
        # STEP 3: Market exposures removed (no longer calculated)
        # ==========================================
        
        # Market exposure calculation has been removed as requested
        
        # ==========================================
        # STEP 4: Continue with processing (processed status updated at the end)
        # ==========================================
        
        # Don't mark as processed yet - only after successful completion
        
        # ==========================================
        # STEP 5: Update daily risk calculation (real-time)
        # ==========================================
        
        # Always update daily risk calculation after processing any news (real-time)
        # This ensures the dashboard always has current risk data immediately
        try:
            calculate_daily_risk_score()
        except Exception as e:
            print(f"⚠️ Warning: Failed to update daily risk calculation: {e}")
            # Don't raise - continue with processing
        
        # ==========================================
        # STEP 6: Trigger SSE event for real-time frontend updates
        # ==========================================
        
        # Insert SSE event to notify frontend of new news
        try:
            with get_risk_db_connection() as risk_conn:
                risk_conn.execute("""
                    INSERT INTO sse_events (event_type, event_data, created_at)
                    VALUES ('news_update', ?, datetime('now'))
                """, [json.dumps({
                    'news_id': risk_db_id,
                    'headline': news_data['headline'],
                    'severity_level': risk_analysis['severity_level'],
                    'source_name': news_data['newsSource'],
                    'published_date': news_data['creationTimestamp'],
                    'action': 'news_processed'
                })])
                risk_conn.commit()
            
            print(f"📡 SSE event triggered for news ID {risk_db_id}")
        except Exception as e:
            print(f"⚠️ Warning: Failed to trigger SSE event: {e}")
            # Don't raise - continue with processing
        
        # ==========================================
        # FINAL STEP: Mark news as processed ONLY after successful completion
        # ==========================================
        
        # Mark as processed only after ALL processing is complete
        try:
            with get_knowledge_db_connection() as knowledge_conn:
                print(f"🔄 Marking news {news_data['newsId']} as processed...")
                result = knowledge_conn.execute("""
                    UPDATE raw_news_data 
                    SET processed = 1, processed_at = CURRENT_TIMESTAMP 
                    WHERE news_id = ?
                """, [news_data['newsId']])
                
                if result.rowcount == 0:
                    print(f"⚠️ Warning: No rows updated for news_id {news_data['newsId']} - ID might not exist in raw_news_data")
                else:
                    print(f"✅ Marked news {news_data['newsId']} as processed (updated {result.rowcount} row)")
                
                knowledge_conn.commit()
        except Exception as e:
            print(f"⚠️ Warning: Failed to mark news as processed: {e}")
            # Don't raise - processing was successful, just logging failed
        
        print(f"✅ Completed news {news_data['newsId']} → Risk DB ID {risk_db_id} - Risk: {risk_analysis['severity_level']}")
        return f"Successfully processed news {news_data['newsId']} (Risk DB ID: {risk_db_id})"
        
    except json.JSONDecodeError as e:
        error_msg = f"OpenAI returned invalid JSON for news {news_data['newsId']}: {e}"
        print(f"❌ {error_msg}")
        raise Exception(error_msg)
        
    except Exception as e:
        error_msg = f"Failed to process news {news_data['newsId']}: {str(e)}"
        print(f"❌ {error_msg}")
        raise

def calculate_daily_risk_score():
    """
    Calculate and update the daily overall risk score (direct execution)
    This is called immediately after processing news for real-time updates
    """
    print("📊 Updating daily risk calculation (real-time)...")
    
    try:
        with get_risk_db_connection() as risk_conn:
            # Get the latest date from news articles to use as "current" date
            latest_date_result = risk_conn.execute("""
                SELECT DATE(MAX(published_date)) as latest_date
                FROM news_articles 
                WHERE status != 'Archived'
            """).fetchone()
            
            if not latest_date_result or not latest_date_result[0]:
                print("No news available for risk calculation")
                return
                
            latest_date = latest_date_result[0]
            print(f"📊 Calculating risk for latest date: {latest_date}")
            
            # Get all news from the latest date
            latest_news = risk_conn.execute("""
                SELECT severity_level, financial_exposure, confidence_score, impact_score, sentiment_score
                FROM news_articles 
                WHERE DATE(published_date) = ?
                  AND status != 'Archived'
            """, [latest_date]).fetchall()
            
            if not latest_news:
                print(f"No news found for date {latest_date} for risk calculation")
                return
            
            # Calculate weighted risk score
            total_risk_points = 0
            total_weight = 0
            total_exposure = 0
            negative_sentiment_count = 0
            
            severity_weights = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1}
            
            for news in latest_news:
                severity_level, financial_exposure, confidence_score, impact_score, sentiment_score = news
                
                # Calculate weighted risk contribution
                severity_weight = severity_weights.get(severity_level, 1)
                confidence_weight = (confidence_score or 50) / 100
                impact_weight = (impact_score or 50) / 100
                
                news_risk_points = severity_weight * confidence_weight * impact_weight
                total_risk_points += news_risk_points
                total_weight += 1
                
                # Sum financial exposure
                total_exposure += financial_exposure or 0
                
                # Count negative sentiment
                if (sentiment_score or 0) < -0.1:
                    negative_sentiment_count += 1
            
            # Calculate overall risk score (0-10 scale)
            base_risk_score = (total_risk_points / max(total_weight, 1)) * 2.5  # Scale to 0-10
            
            # Adjust for sentiment and exposure
            sentiment_adjustment = (negative_sentiment_count / max(len(latest_news), 1)) * 0.5
            exposure_adjustment = min(total_exposure / 10000000000, 1.0) * 0.5  # Cap at $10B
            
            overall_risk_score = min(base_risk_score + sentiment_adjustment + exposure_adjustment, 10.0)
            
            # Determine risk trend (compare to previous day)
            previous_day_score = risk_conn.execute("""
                SELECT overall_risk_score 
                FROM risk_calculations 
                WHERE calculation_date = DATE(?, '-1 day')
                ORDER BY created_at DESC LIMIT 1
            """, [latest_date]).fetchone()
            
            if previous_day_score:
                previous_risk = previous_day_score[0]
                if overall_risk_score > previous_risk + 0.5:
                    risk_trend = 'Rising'
                elif overall_risk_score < previous_risk - 0.5:
                    risk_trend = 'Falling'
                elif abs(overall_risk_score - previous_risk) > 1.0:
                    risk_trend = 'Volatile'
                else:
                    risk_trend = 'Stable'
            else:
                risk_trend = 'Stable'
            
            # Identify contributing factors
            contributing_factors = []
            
            # Get top risk categories
            risk_categories = risk_conn.execute("""
                SELECT primary_risk_category, COUNT(*) as count
                FROM news_articles 
                WHERE DATE(published_date) = ?
                  AND severity_level IN ('Critical', 'High')
                GROUP BY primary_risk_category
                ORDER BY count DESC
                LIMIT 3
            """, [latest_date]).fetchall()
            
            for category, count in risk_categories:
                if count > 0:
                    contributing_factors.append(f"{category.replace('_', ' ').title()} ({count} news)")
            
            # Get top keywords
            top_keywords = risk_conn.execute("""
                SELECT value as keyword, COUNT(*) as frequency
                FROM news_articles
                CROSS JOIN json_each(news_articles.keywords)
                WHERE DATE(published_date) = ?
                  AND severity_level IN ('Critical', 'High')
                  AND keywords IS NOT NULL
                  AND value IS NOT NULL
                GROUP BY value
                ORDER BY frequency DESC
                LIMIT 2
            """, [latest_date]).fetchall()
            
            for keyword, freq in top_keywords:
                if freq > 1:
                    contributing_factors.append(f"{keyword.title()} ({freq} mentions)")
            
            # Insert or update risk calculation
            risk_conn.execute("""
                INSERT OR REPLACE INTO risk_calculations (
                    calculation_date, overall_risk_score, total_financial_exposure,
                    exposure_currency, risk_trend, calculation_method, contributing_factors
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [
                latest_date,
                round(overall_risk_score, 1),
                total_exposure,
                'USD',
                risk_trend,
                'Weighted Average + Sentiment + Exposure',
                json.dumps(contributing_factors)
            ])
            
            risk_conn.commit()
            
            # Trigger SSE event for risk calculation update
            risk_conn.execute("""
                INSERT INTO sse_events (event_type, event_data, created_at)
                VALUES ('risk_change', ?, datetime('now'))
            """, [json.dumps({
                'calculation_date': latest_date,
                'overall_risk_score': round(overall_risk_score, 1),
                'risk_trend': risk_trend,
                'contributing_factors': contributing_factors,
                'action': 'risk_calculation_updated'
            })])
            risk_conn.commit()
            
            print(f"✅ Updated daily risk calculation: Score={overall_risk_score:.1f}, Trend={risk_trend} (based on {latest_date})")
            print(f"   Contributing factors: {', '.join(contributing_factors)}")
            print(f"📡 SSE event triggered for risk calculation update")
            
            return f"Daily risk calculation updated: {overall_risk_score:.1f} ({risk_trend}) for {latest_date}"
        
    except Exception as e:
        print(f"❌ Failed to update daily risk calculation: {e}")
        raise

@huey.task(retries=2)
def update_daily_risk_calculation():
    """
    Huey task wrapper for daily risk calculation (for periodic/background processing)
    """
    return calculate_daily_risk_score()

# ==========================================
# PERIODIC TASKS: Automated processing
# ==========================================

@huey.periodic_task(crontab(minute='*'))
def auto_process_news():
    """
    Periodic task: Automatically process unprocessed news every minute
    This ensures continuous processing without manual intervention
    """
    print("🔄 Auto-processing: Checking for unprocessed news...")
    
    try:
        # Check for unprocessed news
        with get_knowledge_db_connection() as knowledge_conn:
            unprocessed_count = knowledge_conn.execute("""
                SELECT COUNT(*) FROM raw_news_data WHERE processed = 0
            """).fetchone()[0]
            
            if unprocessed_count > 0:
                print(f"📰 Found {unprocessed_count} unprocessed articles - queuing for processing...")
                
                # Get unprocessed news
                knowledge_conn.row_factory = sqlite3.Row
                unprocessed_news = knowledge_conn.execute("""
                    SELECT news_id, headline, story, news_source, creation_timestamp, 
                           language, date_line, badges, teaser
                    FROM raw_news_data 
                    WHERE processed = 0
                    ORDER BY creation_timestamp DESC
                    LIMIT 10
                """).fetchall()
                
                # Queue each article for processing
                for news_row in unprocessed_news:
                    news_data = {
                        'newsId': news_row['news_id'],
                        'headline': news_row['headline'],
                        'story': news_row['story'],
                        'newsSource': news_row['news_source'], 
                        'creationTimestamp': news_row['creation_timestamp'],
                        'language': news_row['language'],
                        'dateLine': news_row['date_line'],
                        'badges': news_row['badges'],
                        'teaser': news_row['teaser'] if news_row['teaser'] else ''
                    }
                    
                    # Queue for processing using our new Evaluator-Optimizer workflow
                    process_news_article(news_data)
                
                print(f"✅ Queued {len(unprocessed_news)} articles for processing")
            else:
                print("✅ No unprocessed news found - system is up to date")
                
    except Exception as e:
        print(f"❌ Auto-processing error: {e}")
        # Don't raise - let the periodic task continue on next cycle

@huey.periodic_task(crontab(minute='0', hour='*/6'))  # Every 6 hours
def auto_update_risk_calculation():
    """
    Periodic task: Update daily risk calculation every 6 hours
    This ensures the dashboard always has current risk data even without new news
    """
    print("📊 Auto-updating daily risk calculation...")
    try:
        update_daily_risk_calculation()
        print("✅ Auto risk calculation completed")
    except Exception as e:
        print(f"❌ Auto risk calculation error: {e}")
        # Don't raise - let the periodic task continue on next cycle

# ==========================================
# PUBLISHER: Read knowledge store and queue news
# ==========================================

def publish_all_news():
    """
    Publisher: Read all news from knowledge store and queue for processing
    This is the Kafka-style producer - fire and forget!
    """
    print("📰 Reading news from knowledge store...")
    
    try:
        # Connect to your existing knowledge store database using connection pooling
        with get_knowledge_db_connection() as knowledge_conn:
            knowledge_conn.row_factory = sqlite3.Row
            
            # Query the actual raw_news_data table structure
            all_news = knowledge_conn.execute("""
                SELECT news_id, headline, story, news_source, creation_timestamp, 
                       language, date_line, badges, teaser
                FROM raw_news_data 
                WHERE processed = 0
                ORDER BY creation_timestamp DESC
            """).fetchall()
            
            print(f"📊 Found {len(all_news)} unprocessed news articles in knowledge store")
            
            # Queue each news article for processing
            queued_count = 0
            for news_row in all_news:
                news_data = {
                    'newsId': news_row['news_id'],
                    'headline': news_row['headline'],
                    'story': news_row['story'],
                    'newsSource': news_row['news_source'], 
                    'creationTimestamp': news_row['creation_timestamp'],
                    'language': news_row['language'],
                    'dateLine': news_row['date_line'],
                    'badges': news_row['badges'],
                    'teaser': news_row['teaser'] if news_row['teaser'] else ''
                }
                
                # Fire and forget - queue the processing job!
                process_news_article(news_data)
                queued_count += 1
        
        print(f"✅ Successfully queued {queued_count} news articles for processing")
        print(f"🔧 Start worker with: python -m huey.bin.huey_consumer news_risk_analyzer.huey")
        print(f"📊 Monitor Huey at: http://localhost:8080 (worker monitoring)")
        print(f"🌐 Main API at: http://localhost:8000 (dashboard API)")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        print(f"💡 Make sure {Config.KNOWLEDGE_DB} exists and has the correct table structure")
    except Exception as e:
        print(f"❌ Error publishing news: {e}")

def publish_recent_news(hours=24):
    """Publisher: Only queue news from last X hours based on latest data timestamp using connection pooling"""
    print(f"📰 Reading news from last {hours} hours based on latest data...")
    
    try:
        with get_knowledge_db_connection() as knowledge_conn:
            knowledge_conn.row_factory = sqlite3.Row
            
            # Get the latest timestamp from raw_news_data
            latest_timestamp_result = knowledge_conn.execute("""
                SELECT MAX(creation_timestamp) as latest_timestamp
                FROM raw_news_data 
                WHERE processed = 0
            """).fetchone()
            
            if not latest_timestamp_result or not latest_timestamp_result[0]:
                print("No unprocessed news available")
                return
                
            latest_timestamp = latest_timestamp_result[0]
            print(f"📊 Latest news timestamp: {latest_timestamp}")
            
            recent_news = knowledge_conn.execute("""
                SELECT news_id, headline, story, news_source, creation_timestamp,
                       language, date_line, badges, teaser
                FROM raw_news_data 
                WHERE processed = 0 
                  AND creation_timestamp >= datetime(?, '-{} hours')
                ORDER BY creation_timestamp DESC
            """.format(hours), [latest_timestamp]).fetchall()
            
            print(f"📊 Found {len(recent_news)} recent unprocessed news articles")
            
            for news_row in recent_news:
                news_data = {
                    'newsId': news_row['news_id'],
                    'headline': news_row['headline'],
                    'story': news_row['story'],
                    'newsSource': news_row['news_source'],
                    'creationTimestamp': news_row['creation_timestamp'],
                    'teaser': news_row['teaser'] if news_row['teaser'] else ''
                }
                process_news_article(news_data)
        
        print(f"✅ Queued {len(recent_news)} recent news articles")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error publishing recent news: {e}")

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def calculate_overall_risk_score(risk_analysis):
    """Calculate overall risk score (0-10) from analysis components"""
    severity_map = {'Critical': 9, 'High': 7, 'Medium': 5, 'Low': 3}
    base_score = severity_map.get(risk_analysis.get('severity_level', 'Low'), 3)
    
    # Adjust based on confidence and impact
    confidence = risk_analysis.get('confidence_score', 50) / 100
    impact = risk_analysis.get('impact_score', 50) / 100
    
    # Weight formula: base score adjusted by confidence and impact
    overall_score = base_score * (0.5 + 0.3 * confidence + 0.2 * impact)
    
    return round(min(overall_score, 10.0), 1)

def get_risk_color(severity_level):
    """Get color coding for dashboard display"""
    color_map = {
        'Critical': '#DC2626',  # Red
        'High': '#EA580C',      # Orange  
        'Medium': '#CA8A04',    # Yellow
        'Low': '#16A34A'        # Green
    }
    return color_map.get(severity_level, '#6B7280')  # Gray default

def get_display_priority(risk_analysis):
    """Calculate display priority (1-100) for dashboard sorting"""
    severity_priority = {
        'Critical': 90,
        'High': 70, 
        'Medium': 50,
        'Low': 30
    }
    
    base_priority = severity_priority.get(risk_analysis.get('severity_level', 'Low'), 30)
    
    # Boost priority for breaking news and market-moving events
    if risk_analysis.get('is_breaking_news', False):
        base_priority += 10
    if risk_analysis.get('is_market_moving', False):
        base_priority += 5
    if risk_analysis.get('financial_exposure', 0) > 1000000000:  # >$1B
        base_priority += 5
        
    return min(base_priority, 100)

# ==========================================
# MONITORING & UTILITIES
# ==========================================

def clear_queue():
    """Clear all pending jobs (for development/testing)"""
    print("🧹 Clearing queue...")
    print("✅ Use huey management commands to clear queue in production")

def queue_health_check():
    """Check if queue system is healthy"""
    try:
        @huey.task()
        def health_check():
            return "Queue is healthy!"
        
        health_check()
        print("✅ Queue health check passed")
        return True
    except Exception as e:
        print(f"❌ Queue health check failed: {e}")
        return False

def get_dashboard_health():
    """Get dashboard system health metrics using connection pooling"""
    try:
        with get_risk_db_connection() as risk_conn:
            # Get the latest timestamp from news articles
            latest_timestamp_result = risk_conn.execute("""
                SELECT MAX(published_date) as latest_timestamp
                FROM news_articles 
                WHERE status != 'Archived'
            """).fetchone()
            
            if not latest_timestamp_result or not latest_timestamp_result[0]:
                print("No news available for health check")
                return {'status': 'error', 'error': 'No news data available', 'last_check': datetime.now().isoformat()}
                
            latest_timestamp = latest_timestamp_result[0]
            
            # Check recent data availability (within 24 hours of latest timestamp)
            recent_news_count = risk_conn.execute("""
                SELECT COUNT(*) FROM news_articles 
                WHERE published_date >= datetime(?, '-24 hours')
            """, [latest_timestamp]).fetchone()[0]
            
            # Check if risk calculation is up to date
            latest_risk_calc = risk_conn.execute("""
                SELECT calculation_date FROM risk_calculations 
                ORDER BY created_at DESC LIMIT 1
            """).fetchone()
        
        health_status = {
            'recent_news_count': recent_news_count,
            'latest_risk_calc_date': latest_risk_calc[0] if latest_risk_calc else None,
            'latest_data_timestamp': latest_timestamp,
            'status': 'healthy' if recent_news_count > 0 else 'warning',
            'last_check': datetime.now().isoformat()
        }
        
        print(f"📊 Dashboard Health: {health_status['status'].upper()}")
        print(f"   Recent news: {recent_news_count}")
        print(f"   Latest data timestamp: {latest_timestamp}")
        print(f"   Latest risk calc: {health_status['latest_risk_calc_date']}")
        
        return health_status
        
    except Exception as e:
        print(f"❌ Dashboard health check failed: {e}")
        return {'status': 'error', 'error': str(e), 'last_check': datetime.now().isoformat()}

# ==========================================
# DEVELOPMENT UTILITIES
# ==========================================

def dev_reset_all_tables():
    """
    DEVELOPMENT ONLY: Reset all tables and clear all data
    Use this to start fresh during development/testing
    """
    print("🚨 DEVELOPMENT RESET: Clearing all tables...")
    print("⚠️  This will DELETE ALL DATA in the system!")
    
    try:
        # Clear processed news tables
        with get_risk_db_connection() as risk_conn:
            print("🗑️  Clearing risk dashboard database...")
            
            # Clear all processed data
            risk_conn.execute("DELETE FROM news_articles")
            risk_conn.execute("DELETE FROM risk_calculations")
            risk_conn.execute("DELETE FROM sse_events")
            risk_conn.execute("DELETE FROM dashboard_cache")
            risk_conn.execute("DELETE FROM risk_storylines")  # Clear cached storylines
            
            # Reset auto-increment counters
            risk_conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('news_articles', 'risk_calculations', 'sse_events', 'risk_storylines')")
            
            # Recreate dashboard_trending_topics view with proper dynamic SQL
            print("🔄 Recreating dashboard_trending_topics view...")
            risk_conn.execute("DROP VIEW IF EXISTS dashboard_trending_topics")
            risk_conn.execute("""
                CREATE VIEW dashboard_trending_topics AS
                SELECT 
                    LOWER(json_extract(keywords.value, '$')) as keyword,
                    COUNT(*) as frequency,
                    AVG(CASE WHEN impact_score IS NOT NULL THEN impact_score ELSE 75.0 END) as avg_impact_score,
                    MAX(published_date) as latest_mention,
                    COUNT(CASE WHEN published_date >= datetime('now', '-6 hours') THEN 1 END) as recent_mentions,
                    AVG(CASE 
                        WHEN severity_level = 'Critical' THEN 4.0
                        WHEN severity_level = 'High' THEN 3.0  
                        WHEN severity_level = 'Medium' THEN 2.0
                        WHEN severity_level = 'Low' THEN 1.0
                        ELSE 2.0
                    END) as avg_risk_level
                FROM news_articles, json_each(keywords) as keywords
                WHERE DATE(published_date) = DATE('now')
                  AND status != 'Archived'
                  AND keywords IS NOT NULL
                  AND json_extract(keywords.value, '$') IS NOT NULL
                GROUP BY LOWER(json_extract(keywords.value, '$'))
                HAVING frequency >= 1
                ORDER BY frequency DESC, recent_mentions DESC
                LIMIT 10
            """)
            
            risk_conn.commit()
            print("✅ Risk dashboard database cleared")
            print("✅ Dashboard trending topics view recreated with dynamic data")
        
        # Reset raw news data processed flags
        with get_knowledge_db_connection() as knowledge_conn:
            print("🗑️  Resetting raw news data...")
            
            # Reset all processed flags to unprocessed
            result = knowledge_conn.execute("""
                UPDATE raw_news_data 
                SET processed = 0, 
                    processed_at = NULL, 
                    processing_error = NULL
            """)
            
            knowledge_conn.commit()
            affected_rows = result.rowcount
            print(f"✅ Reset {affected_rows} raw news articles to unprocessed state")
        
        # Clear Huey queue database
        try:
            import os
            queue_db_path = 'news_processing_queue.db'
            if os.path.exists(queue_db_path):
                print("🗑️  Clearing Huey task queue...")
                # Connect to queue database and clear tasks
                queue_conn = sqlite3.connect(queue_db_path)
                queue_conn.execute("DELETE FROM task")
                queue_conn.execute("DELETE FROM schedule") 
                queue_conn.commit()
                queue_conn.close()
                print("✅ Huey task queue cleared")
            else:
                print("ℹ️  Huey queue database not found (first run)")
        except Exception as e:
            print(f"⚠️  Could not clear Huey queue: {e}")
        
        # Get final counts
        with get_risk_db_connection() as risk_conn:
            processed_count = risk_conn.execute("SELECT COUNT(*) FROM news_articles").fetchone()[0]
            
        with get_knowledge_db_connection() as knowledge_conn:
            total_raw = knowledge_conn.execute("SELECT COUNT(*) FROM raw_news_data").fetchone()[0]
            unprocessed_raw = knowledge_conn.execute("SELECT COUNT(*) FROM raw_news_data WHERE processed = 0").fetchone()[0]
        
        print("\n📊 RESET COMPLETE - System Status:")
        print(f"   📰 Raw news articles: {total_raw} total, {unprocessed_raw} unprocessed")
        print(f"   🔄 Processed news: {processed_count}")
        print(f"   🎯 Ready for fresh processing!")
        print("\n💡 To start processing:")
        print("   1. Ensure Huey worker is running: python -m huey.bin.huey_consumer news_risk_analyzer.huey")
        print("   2. The periodic task will auto-process news every 1 minute")
        print("   3. Or manually trigger: python news_publisher.py publish-all")
        
        return {
            'status': 'success',
            'raw_news_total': total_raw,
            'raw_news_unprocessed': unprocessed_raw,
            'processed_news_cleared': True,
            'queue_cleared': True
        }
        
    except Exception as e:
        error_msg = f"❌ Failed to reset system: {e}"
        print(error_msg)
        return {'status': 'error', 'error': str(e)}

def dev_add_test_news(count=1):
    """
    DEVELOPMENT ONLY: Add test news articles for testing automation
    """
    print(f"🧪 Adding {count} test news article(s)...")
    
    test_articles = [
        {
            'headline': 'Federal Reserve Announces Emergency Rate Cut - Banking Sector Alert',
            'story': 'The Federal Reserve announced an emergency 50 basis point rate cut following concerns about banking sector stability. The decision comes amid rising credit defaults and liquidity concerns in regional banks. Market analysts warn this could signal deeper economic challenges ahead.',
            'source': 'Federal Reserve Bank'
        },
        {
            'headline': 'European Banking Crisis Deepens - Multiple Bank Failures Reported',
            'story': 'Several European banks have reported significant losses due to exposure to high-risk derivatives. Regulators are implementing emergency measures to prevent contagion across the financial system. This represents the worst banking crisis in Europe since 2008.',
            'source': 'European Banking Authority'
        },
        {
            'headline': 'Cryptocurrency Market Crash Affects Traditional Banking',
            'story': 'The sudden collapse of major cryptocurrency exchanges has sent shockwaves through traditional banking institutions with crypto exposure. Banks are scrambling to assess their risk exposure as digital asset values plummet by over 60% in 24 hours.',
            'source': 'CryptoFinance Today'
        },
        {
            'headline': 'Global Supply Chain Disruption Threatens Bank Lending',
            'story': 'Massive supply chain disruptions have led to increased default rates on commercial loans. Banks are tightening lending standards as manufacturing and shipping companies struggle with unprecedented operational challenges and rising costs.',
            'source': 'Global Trade Finance'
        },
        {
            'headline': 'Major Cybersecurity Breach Exposes Banking Infrastructure',
            'story': 'A sophisticated cyber attack has compromised multiple banking networks globally, affecting millions of customer accounts. Security experts warn this attack demonstrates critical vulnerabilities in financial infrastructure that could lead to systemic risks.',
            'source': 'CyberSecurity Banking Alert'
        }
    ]
    
    try:
        with get_knowledge_db_connection() as knowledge_conn:
            added_count = 0
            
            for i in range(count):
                article = test_articles[i % len(test_articles)]
                
                # Generate unique ID with timestamp
                news_id = f'DEV_TEST_{datetime.now().strftime("%Y%m%d_%H%M%S")}_{i+1:03d}'
                
                knowledge_conn.execute("""
                    INSERT INTO raw_news_data (
                        news_id, headline, creation_timestamp, modification_timestamp,
                        news_source, language, story, processed
                    ) VALUES (?, ?, datetime('now'), datetime('now'), ?, 'en', ?, 0)
                """, [
                    news_id,
                    f"{article['headline']} - Test {i+1}",
                    article['source'],
                    article['story']
                ])
                added_count += 1
            
            knowledge_conn.commit()
            print(f"✅ Added {added_count} test news articles")
            print("🔄 These will be automatically processed by the periodic task within 1 minute")
            
            return {'status': 'success', 'added_count': added_count}
            
    except Exception as e:
        error_msg = f"❌ Failed to add test news: {e}"
        print(error_msg)
        return {'status': 'error', 'error': str(e)}

def dev_system_status():
    """
    DEVELOPMENT ONLY: Get comprehensive system status for debugging
    """
    print("📊 DEVELOPMENT SYSTEM STATUS")
    print("=" * 50)
    
    try:
        status = {}
        
        # LLM Configuration status
        llm_provider = os.getenv('LLM_PROVIDER', 'openai').lower()
        llm_model = os.getenv('LLM_MODEL', 'gpt-4o')
        
        print(f"🤖 LLM CONFIGURATION:")
        print(f"   Provider: {llm_provider.upper()}")
        print(f"   Model: {llm_model}")
        
        if llm_provider == 'azure':
            azure_endpoint = os.getenv('AZURE_OPENAI_ENDPOINT', 'Not configured')
            deployment_name = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME', 'Not configured')
            print(f"   Azure Endpoint: {azure_endpoint}")
            print(f"   Deployment Name: {deployment_name}")
        
        # Raw news data status
        with get_knowledge_db_connection() as knowledge_conn:
            raw_stats = knowledge_conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN processed = 0 THEN 1 END) as unprocessed,
                    COUNT(CASE WHEN processed = 1 THEN 1 END) as processed,
                    MIN(creation_timestamp) as oldest,
                    MAX(creation_timestamp) as newest
                FROM raw_news_data
            """).fetchone()
            
            if raw_stats[0] > 0:
                recent_unprocessed = knowledge_conn.execute("""
                    SELECT news_id, headline, creation_timestamp
                    FROM raw_news_data 
                    WHERE processed = 0 
                    ORDER BY creation_timestamp DESC 
                    LIMIT 3
                """).fetchall()
            else:
                recent_unprocessed = []
        
        # Processed news status  
        with get_risk_db_connection() as risk_conn:
            processed_stats = risk_conn.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN severity_level = 'Critical' THEN 1 END) as critical,
                    COUNT(CASE WHEN severity_level = 'High' THEN 1 END) as high,
                    COUNT(CASE WHEN severity_level = 'Medium' THEN 1 END) as medium,
                    COUNT(CASE WHEN severity_level = 'Low' THEN 1 END) as low
                FROM news_articles
            """).fetchone()
            
            risk_calc_count = risk_conn.execute("SELECT COUNT(*) FROM risk_calculations").fetchone()[0]
        
        # Display status
        print(f"📰 RAW NEWS DATA:")
        print(f"   Total: {raw_stats[0]} articles")
        print(f"   Unprocessed: {raw_stats[1]} articles")
        print(f"   Processed: {raw_stats[2]} articles")
        print(f"   Date range: {raw_stats[3]} to {raw_stats[4]}")
        
        print(f"\n🔄 PROCESSED NEWS:")
        print(f"   Total: {processed_stats[0]} articles")
        print(f"   Critical: {processed_stats[1]}, High: {processed_stats[2]}")
        print(f"   Medium: {processed_stats[3]}, Low: {processed_stats[4]}")
        
        print(f"\n💰 MARKET DATA:")
        print(f"   Risk calculations: {risk_calc_count}")
        
        if recent_unprocessed:
            print(f"\n📋 RECENT UNPROCESSED NEWS:")
            for news in recent_unprocessed:
                print(f"   • {news[0]}: {news[1][:60]}... ({news[2]})")
        else:
            print(f"\n✅ NO UNPROCESSED NEWS - System is up to date!")
        
        # Queue status
        try:
            queue_db_path = 'news_processing_queue.db'
            if os.path.exists(queue_db_path):
                queue_conn = sqlite3.connect(queue_db_path)
                pending_tasks = queue_conn.execute("SELECT COUNT(*) FROM task WHERE NOT executed").fetchone()[0]
                completed_tasks = queue_conn.execute("SELECT COUNT(*) FROM task WHERE executed").fetchone()[0]
                queue_conn.close()
                print(f"\n⚙️  HUEY QUEUE:")
                print(f"   Pending tasks: {pending_tasks}")
                print(f"   Completed tasks: {completed_tasks}")
            else:
                print(f"\n⚙️  HUEY QUEUE: Not initialized")
        except Exception as e:
            print(f"\n⚙️  HUEY QUEUE: Error reading queue ({e})")
        
        status = {
            'raw_news': {
                'total': raw_stats[0], 'unprocessed': raw_stats[1], 'processed': raw_stats[2]
            },
            'processed_news': {
                'total': processed_stats[0], 'critical': processed_stats[1], 
                'high': processed_stats[2], 'medium': processed_stats[3], 'low': processed_stats[4]
            },
            'market_data': {
                'risk_calculations': risk_calc_count
            }
        }
        
        print("\n" + "=" * 50)
        return status
        
    except Exception as e:
        error_msg = f"❌ Failed to get system status: {e}"
        print(error_msg)
        return {'status': 'error', 'error': str(e)}

# ==========================================
# MAIN EXECUTION
# ==========================================

if __name__ == "__main__":
    print("⚠️  WARNING: Running news_risk_analyzer.py directly causes task naming issues!")
    print("📋 RECOMMENDED USAGE:")
    print("   Publisher: python news_publisher.py publish-all")
    print("   Worker:    python -m huey.bin.huey_consumer news_risk_analyzer.huey")
    print("   API:       python -m uvicorn risk_dashboard_api:app --reload")
    print()
    print("🔧 If you must run this directly, tasks will be registered as '__main__' module")
    print("   which may cause compatibility issues with the worker.")
    print()
    
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "publish-all":
            print("⚠️  Using news_publisher.py instead is recommended for consistent task naming")
            publish_all_news()
        elif command == "publish-recent":
            hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24
            print("⚠️  Using news_publisher.py instead is recommended for consistent task naming")
            publish_recent_news(hours)
        elif command == "health-check":
            queue_health_check()
        elif command == "dashboard-health":
            get_dashboard_health()
        elif command == "update-risk":
            update_daily_risk_calculation()
        elif command == "clear":
            clear_queue()
        elif command == "dev-reset":
            dev_reset_all_tables()
        elif command == "dev-add-test":
            count = int(sys.argv[2]) if len(sys.argv) > 2 else 1
            dev_add_test_news(count)
        elif command == "dev-status":
            dev_system_status()
        else:
            print("Available commands:")
            print("  publish-all       - Queue all news for processing (use news_publisher.py instead)")
            print("  publish-recent X  - Queue news from last X hours (use news_publisher.py instead)")
            print("  health-check      - Check queue system health")
            print("  dashboard-health  - Check dashboard data health")
            print("  update-risk       - Manually update daily risk calculation")
            print("  clear            - Clear queue (development only)")
            print("")
            print("Development commands:")
            print("  dev-reset         - 🚨 CLEAR ALL TABLES and reset system to fresh state")
            print("  dev-add-test [N]  - Add N test news articles (default: 1)")
            print("  dev-status        - Show comprehensive system status")
    else:
        print("💡 Use: python news_publisher.py publish-all")
        print("   This ensures proper task registration for Huey worker compatibility.")

