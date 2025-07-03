#!/usr/bin/env python3
"""
Check all news articles and their sentiment scores
"""

import sqlite3
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    """Get database connection with context manager"""
    conn = sqlite3.connect('risk_dashboard.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def check_all_sentiment():
    """Check all articles and their sentiment scores"""
    with get_db_connection() as conn:
        # Get all articles ordered by sentiment score (highest first)
        cursor = conn.execute("""
            SELECT id, headline, sentiment_score, published_date, source_name
            FROM news_articles 
            ORDER BY sentiment_score DESC
            LIMIT 20
        """)
        
        articles = cursor.fetchall()
        
        print(f"Top 20 articles by sentiment score:")
        print("-" * 120)
        
        for article in articles:
            sentiment_label = "POSITIVE" if article['sentiment_score'] > 0 else "NEUTRAL" if article['sentiment_score'] == 0 else "NEGATIVE"
            print(f"ID: {article['id']:<4} | Sentiment: {article['sentiment_score']:>6.2f} ({sentiment_label:<8}) | Date: {article['published_date'][:10]} | {article['headline'][:70]}...")
        
        print(f"\n📊 Sentiment distribution:")
        
        # Get sentiment distribution
        cursor = conn.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN sentiment_score > 0 THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN sentiment_score = 0 THEN 1 ELSE 0 END) as neutral,
                SUM(CASE WHEN sentiment_score < 0 THEN 1 ELSE 0 END) as negative
            FROM news_articles
        """)
        
        stats = cursor.fetchone()
        print(f"Total articles: {stats['total']}")
        print(f"Positive (>0): {stats['positive']}")
        print(f"Neutral (=0): {stats['neutral']}")
        print(f"Negative (<0): {stats['negative']}")
        
        # Check articles from today
        print(f"\n📅 Recent articles (last 24 hours):")
        cursor = conn.execute("""
            SELECT id, headline, sentiment_score, published_date
            FROM news_articles 
            WHERE published_date >= datetime('now', '-1 day')
            ORDER BY published_date DESC
            LIMIT 10
        """)
        
        recent_articles = cursor.fetchall()
        for article in recent_articles:
            sentiment_label = "POSITIVE" if article['sentiment_score'] > 0 else "NEUTRAL" if article['sentiment_score'] == 0 else "NEGATIVE"
            print(f"ID: {article['id']:<4} | Sentiment: {article['sentiment_score']:>6.2f} ({sentiment_label:<8}) | {article['published_date'][:16]} | {article['headline'][:60]}...")

if __name__ == "__main__":
    print("🔍 Checking all news articles and sentiment scores...")
    check_all_sentiment() 