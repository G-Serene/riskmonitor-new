#!/usr/bin/env python3
"""
Quick database view checker to diagnose SSE errors
"""

import sqlite3
import json

def check_database():
    print("🔍 Checking Risk Dashboard Database")
    print("=" * 50)
    
    try:
        conn = sqlite3.connect('risk_dashboard.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check critical views used by SSE cascading updates
        critical_views = [
            'dashboard_summary',
            'dashboard_risk_breakdown', 
            'recent_news_feed'
        ]
        
        print("📊 Checking Critical Views:")
        for view_name in critical_views:
            try:
                result = cursor.execute(f'SELECT COUNT(*) as count FROM {view_name}').fetchone()
                print(f"  ✅ {view_name}: {result['count']} rows")
            except Exception as e:
                print(f"  ❌ {view_name}: ERROR - {e}")
        
        print()
        
        # Check news_articles table structure
        print("📰 Checking news_articles table:")
        try:
            result = cursor.execute('SELECT COUNT(*) as count FROM news_articles').fetchone()
            print(f"  ✅ news_articles: {result['count']} rows")
            
            # Check for recent articles
            recent = cursor.execute("""
                SELECT COUNT(*) as count FROM news_articles 
                WHERE DATE(published_date) = DATE('now')
            """).fetchone()
            print(f"  📅 Today's articles: {recent['count']}")
            
        except Exception as e:
            print(f"  ❌ news_articles: ERROR - {e}")
        
        print()
        
        # Check risk_calculations table
        print("📈 Checking risk_calculations table:")
        try:
            result = cursor.execute('SELECT COUNT(*) as count FROM risk_calculations').fetchone()
            print(f"  ✅ risk_calculations: {result['count']} rows")
            
            # Check for recent calculations
            latest = cursor.execute("""
                SELECT calculation_date, overall_risk_score 
                FROM risk_calculations 
                ORDER BY calculation_date DESC LIMIT 1
            """).fetchone()
            if latest:
                print(f"  📊 Latest calculation: {latest['calculation_date']} (score: {latest['overall_risk_score']})")
            else:
                print(f"  ⚠️ No risk calculations found")
                
        except Exception as e:
            print(f"  ❌ risk_calculations: ERROR - {e}")
        
        print()
        
        # Test the specific queries used in cascading updates
        print("🔄 Testing Cascading Update Queries:")
        
        # Test dashboard_summary query
        try:
            summary = cursor.execute("SELECT * FROM dashboard_summary").fetchone()
            if summary:
                print(f"  ✅ dashboard_summary query: OK")
            else:
                print(f"  ⚠️ dashboard_summary query: No data")
        except Exception as e:
            print(f"  ❌ dashboard_summary query: {e}")
        
        # Test risk_breakdown query  
        try:
            breakdown = cursor.execute("SELECT * FROM dashboard_risk_breakdown").fetchall()
            print(f"  ✅ dashboard_risk_breakdown query: {len(breakdown)} categories")
        except Exception as e:
            print(f"  ❌ dashboard_risk_breakdown query: {e}")
        
        # Test recent news query
        try:
            news = cursor.execute("""
                SELECT * FROM news_articles 
                WHERE status != 'Archived'
                ORDER BY display_priority DESC, published_date DESC 
                LIMIT 5
            """).fetchall()
            print(f"  ✅ recent news query: {len(news)} articles")
        except Exception as e:
            print(f"  ❌ recent news query: {e}")
        
        conn.close()
        print()
        print("✅ Database check completed!")
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

if __name__ == "__main__":
    check_database() 