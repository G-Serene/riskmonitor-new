#!/usr/bin/env python3
"""
Check trending topics data in the database
"""
import sqlite3
import json

def check_database():
    """Check what trending data exists in the database"""
    print("🔍 Checking Database for Trending Topics Data...\n")
    
    try:
        # Connect to database
        conn = sqlite3.connect('risk_dashboard.db')
        conn.row_factory = sqlite3.Row
        
        # Check if dashboard_trending_topics view exists
        print("1. Checking if dashboard_trending_topics view exists...")
        views = conn.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='view' AND name='dashboard_trending_topics'
        """).fetchall()
        
        if views:
            print("✅ dashboard_trending_topics view exists")
            
            # Check data in the view
            print("\n2. Checking data in dashboard_trending_topics view...")
            trending_data = conn.execute("SELECT * FROM dashboard_trending_topics LIMIT 5").fetchall()
            
            if trending_data:
                print(f"✅ Found {len(trending_data)} trending topics:")
                for row in trending_data:
                    print(f"   - {row['keyword']}: freq={row['frequency']}, impact={row['avg_impact_score']}")
            else:
                print("❌ No data in dashboard_trending_topics view")
        else:
            print("❌ dashboard_trending_topics view does not exist")
        
        # Check news_articles table for keywords
        print("\n3. Checking news_articles for keywords data...")
        keywords_sample = conn.execute("""
            SELECT id, headline, keywords 
            FROM news_articles 
            WHERE keywords IS NOT NULL AND keywords != '' AND keywords != '[]'
            LIMIT 5
        """).fetchall()
        
        if keywords_sample:
            print(f"✅ Found {len(keywords_sample)} articles with keywords:")
            for row in keywords_sample:
                try:
                    keywords = json.loads(row['keywords']) if row['keywords'] else []
                    print(f"   - Article {row['id']}: {keywords[:3]}...")  # Show first 3 keywords
                except:
                    print(f"   - Article {row['id']}: {row['keywords'][:50]}...")
        else:
            print("❌ No keywords found in news_articles")
        
        # Check total articles count
        print("\n4. Checking total news articles...")
        total_articles = conn.execute("SELECT COUNT(*) as count FROM news_articles").fetchone()
        print(f"📰 Total articles in database: {total_articles['count']}")
        
        # Check if articles have been processed with keywords
        processed_articles = conn.execute("""
            SELECT COUNT(*) as count FROM news_articles 
            WHERE keywords IS NOT NULL AND keywords != '' AND keywords != '[]'
        """).fetchone()
        print(f"🔑 Articles with keywords: {processed_articles['count']}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check_database()
