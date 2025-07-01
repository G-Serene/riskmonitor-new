#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('risk_dashboard.db')
cursor = conn.cursor()

# Check tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", [table[0] for table in tables])

# Check news count if table exists
try:
    cursor.execute("SELECT COUNT(*) FROM news_articles")
    count = cursor.fetchone()[0]
    print(f"News articles count: {count}")
    
    if count > 0:
        # Get a sample of themes
        cursor.execute("SELECT DISTINCT primary_risk_category FROM news_articles WHERE primary_risk_category IS NOT NULL LIMIT 5")
        themes = cursor.fetchall()
        print("Sample themes:", [theme[0] for theme in themes])
        
        # Get recent headlines
        cursor.execute("SELECT headline FROM news_articles ORDER BY published_date DESC LIMIT 3")
        headlines = cursor.fetchall()
        print("Recent headlines:")
        for headline in headlines:
            print(f"  - {headline[0]}")
            
except Exception as e:
    print(f"Error checking news_articles: {e}")

conn.close()
