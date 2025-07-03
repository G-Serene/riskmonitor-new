#!/usr/bin/env python3
"""
Check for positive sentiment news articles in the database and remove them
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

def check_positive_sentiment_news():
    """Check for positive sentiment news in the database"""
    with get_db_connection() as conn:
        # Get all articles with positive sentiment
        cursor = conn.execute("""
            SELECT id, headline, sentiment_score, published_date, source_name
            FROM news_articles 
            WHERE sentiment_score > 0 
            ORDER BY sentiment_score DESC
        """)
        
        positive_articles = cursor.fetchall()
        
        print(f"Found {len(positive_articles)} articles with positive sentiment:")
        print("-" * 100)
        
        for article in positive_articles:
            print(f"ID: {article['id']:<4} | Sentiment: {article['sentiment_score']:>6.2f} | Date: {article['published_date'][:10]} | Source: {article['source_name']:<15} | Headline: {article['headline'][:60]}...")
        
        return positive_articles

def remove_positive_sentiment_news():
    """Remove positive sentiment news from the database"""
    with get_db_connection() as conn:
        # First, count how many we'll remove
        cursor = conn.execute("SELECT COUNT(*) FROM news_articles WHERE sentiment_score > 0")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("No positive sentiment news articles found to remove.")
            return
        
        print(f"Removing {count} positive sentiment news articles...")
        
        # Remove positive sentiment articles
        cursor = conn.execute("DELETE FROM news_articles WHERE sentiment_score > 0")
        conn.commit()
        
        print(f"✅ Successfully removed {cursor.rowcount} positive sentiment news articles")

if __name__ == "__main__":
    print("🔍 Checking for positive sentiment news articles...")
    positive_articles = check_positive_sentiment_news()
    
    if positive_articles:
        print(f"\n❓ Found {len(positive_articles)} positive sentiment articles.")
        response = input("Do you want to remove them? (y/n): ")
        
        if response.lower() == 'y':
            remove_positive_sentiment_news()
        else:
            print("No articles removed.")
    else:
        print("✅ No positive sentiment news articles found.") 