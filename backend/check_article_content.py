#!/usr/bin/env python3
"""
Check the content of specific articles to understand sentiment scoring
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

def check_article_content():
    """Check the content of the AI Technology article"""
    with get_db_connection() as conn:
        # Get the AI Technology article
        cursor = conn.execute("""
            SELECT id, headline, content, summary, sentiment_score, severity_level
            FROM news_articles 
            WHERE headline LIKE '%Tech Company%' OR headline LIKE '%AI Technology%'
        """)
        
        article = cursor.fetchone()
        
        if article:
            print(f"📰 Article Analysis:")
            print(f"ID: {article['id']}")
            print(f"Headline: {article['headline']}")
            print(f"Sentiment Score: {article['sentiment_score']}")
            print(f"Severity Level: {article['severity_level']}")
            print(f"\n📝 Summary:")
            print(article['summary'])
            print(f"\n📄 Content:")
            print(article['content'][:1000] + "..." if len(article['content']) > 1000 else article['content'])
        else:
            print("❌ No AI Technology article found")

if __name__ == "__main__":
    check_article_content() 