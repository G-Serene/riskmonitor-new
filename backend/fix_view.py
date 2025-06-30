import sqlite3

# Connect to the correct database that the API uses
conn = sqlite3.connect('risk_dashboard.db')

print("Dropping the old dashboard_initial_load view...")
conn.execute("DROP VIEW IF EXISTS dashboard_initial_load")

print("Creating the new dashboard_initial_load view without market_exposures...")
conn.execute("""
CREATE VIEW dashboard_initial_load AS
WITH latest_date AS (
    SELECT DATE(MAX(published_date)) as max_date
    FROM news_articles 
    WHERE status != 'Archived'
)
SELECT 
    -- Overall Risk Score Widget
    COALESCE((SELECT overall_risk_score 
              FROM risk_calculations 
              WHERE calculation_date = (SELECT max_date FROM latest_date)
              ORDER BY created_at DESC LIMIT 1), 0.0) as overall_risk_score,
              
    COALESCE((SELECT risk_trend 
              FROM risk_calculations 
              WHERE calculation_date = (SELECT max_date FROM latest_date)
              ORDER BY created_at DESC LIMIT 1), 'Stable') as risk_trend,
    
    -- Critical Alerts Widget (last 24 hours from latest date)
    (SELECT COUNT(*) 
     FROM news_articles 
     WHERE severity_level IN ('Critical', 'High')
       AND published_date >= datetime((SELECT max_date FROM latest_date), '-1 day')
       AND status != 'Archived') as critical_alerts,
    
    -- News Sentiment Analysis Widget (last 24 hours from latest date)
    ROUND((SELECT COUNT(CASE WHEN sentiment_score > 0.1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)
           FROM news_articles 
           WHERE published_date >= datetime((SELECT max_date FROM latest_date), '-1 day')
             AND status != 'Archived'), 1) as positive_sentiment_pct,
             
    ROUND((SELECT COUNT(CASE WHEN sentiment_score BETWEEN -0.1 AND 0.1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)
           FROM news_articles 
           WHERE published_date >= datetime((SELECT max_date FROM latest_date), '-1 day')
             AND status != 'Archived'), 1) as neutral_sentiment_pct,
             
    ROUND((SELECT COUNT(CASE WHEN sentiment_score < -0.1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)
           FROM news_articles 
           WHERE published_date >= datetime((SELECT max_date FROM latest_date), '-1 day')
             AND status != 'Archived'), 1) as negative_sentiment_pct,
    
    -- General Dashboard Summary (latest date)
    ds.total_news_today,
    ds.critical_count,
    ds.high_count,
    ds.avg_sentiment,
    ds.current_risk_score,
    
    -- Cache timestamp for client deduplication
    datetime('now') as cache_timestamp
FROM dashboard_summary ds, latest_date
""")

print("Committing changes...")
conn.commit()

print("Testing the new view...")
cursor = conn.execute("SELECT * FROM dashboard_initial_load LIMIT 1")
result = cursor.fetchone()
if result:
    print("SUCCESS: View works correctly!")
    print("Columns:", [description[0] for description in cursor.description])
else:
    print("WARNING: View returns no data")

conn.close()
print("Done!")
