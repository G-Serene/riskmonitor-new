import sqlite3

conn = sqlite3.connect('risk_dashboard.db')

# Drop and recreate the recent_news_feed view without financial_exposure
print('Fixing recent_news_feed view...')
conn.execute('DROP VIEW IF EXISTS recent_news_feed')

conn.execute('''
CREATE VIEW recent_news_feed AS
WITH latest_date AS (
    SELECT MAX(published_date) as max_timestamp
    FROM news_articles 
    WHERE status != 'Archived'
)
SELECT 
    id, headline, summary, source_name, published_date,
    severity_level, primary_risk_category, sentiment_score,
    is_breaking_news, risk_color,
    CAST((julianday(latest_date.max_timestamp) - julianday(published_date)) * 24 * 60 AS INTEGER) as minutes_ago
FROM news_articles, latest_date
WHERE published_date >= datetime(latest_date.max_timestamp, '-24 hours')
  AND status != 'Archived'
ORDER BY display_priority DESC, published_date DESC
LIMIT 50
''')

conn.commit()

# Test the view
print('Testing view...')
result = conn.execute('SELECT id, headline, published_date, minutes_ago FROM recent_news_feed LIMIT 3').fetchall()
for row in result:
    print(f'ID: {row[0]}, Headline: {row[1][:50]}..., Date: {row[2]}, Minutes ago: {row[3]}')

conn.close()
print('Done!')
