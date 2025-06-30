#!/usr/bin/env python3
"""
Development Utilities for News Risk Analyzer
=============================================

Quick development commands for resetting, testing, and monitoring the system.

Usage:
    python dev_utils.py reset          # Reset all tables and start fresh
    python dev_utils.py status         # Show comprehensive system status  
    python dev_utils.py add-test [N]   # Add N test news articles
    python dev_utils.py monitor        # Live monitoring of processing
"""

import sys
import time
from news_risk_analyzer import (
    dev_reset_all_tables, 
    dev_add_test_news, 
    dev_system_status,
    get_knowledge_db_connection,
    get_risk_db_connection
)

def live_monitor():
    """Live monitoring of the processing system"""
    print("🔍 LIVE SYSTEM MONITOR")
    print("Press Ctrl+C to stop monitoring")
    print("=" * 60)
    
    try:
        while True:
            # Get current counts
            with get_knowledge_db_connection() as knowledge_conn:
                raw_stats = knowledge_conn.execute("""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN processed = 0 THEN 1 END) as unprocessed,
                        COUNT(CASE WHEN processed = 1 THEN 1 END) as processed
                    FROM raw_news_data
                """).fetchone()
            
            with get_risk_db_connection() as risk_conn:
                processed_count = risk_conn.execute("SELECT COUNT(*) FROM news_articles").fetchone()[0]
                
                # Get latest processed news
                latest_news = risk_conn.execute("""
                    SELECT headline, severity_level, created_at
                    FROM news_articles 
                    ORDER BY id DESC 
                    LIMIT 3
                """).fetchall()
            
            # Clear screen and show status
            print(f"\r🕐 {time.strftime('%H:%M:%S')} | Raw: {raw_stats[0]} total, {raw_stats[1]} unprocessed | Processed: {processed_count} | ", end="", flush=True)
            
            if latest_news:
                print(f"Latest: {latest_news[0][0][:40]}... ({latest_news[0][1]})")
            else:
                print("No processed news yet")
            
            time.sleep(5)  # Update every 5 seconds
            
    except KeyboardInterrupt:
        print("\n👋 Monitor stopped")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1].lower()
    
    if command == "reset":
        print("🚨 DEVELOPMENT RESET")
        result = dev_reset_all_tables()
        if result['status'] == 'success':
            print(f"\n🎉 System reset complete! {result['raw_news_unprocessed']} articles ready for processing")
        
    elif command == "status":
        dev_system_status()
        
    elif command == "add-test":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        result = dev_add_test_news(count)
        if result['status'] == 'success':
            print(f"\n🎉 Added {result['added_count']} test articles!")
            
    elif command == "monitor":
        live_monitor()
        
    else:
        print("❌ Unknown command. Available commands:")
        print("   reset     - Reset all tables and start fresh")
        print("   status    - Show comprehensive system status")
        print("   add-test  - Add test news articles")
        print("   monitor   - Live monitoring of processing")

if __name__ == "__main__":
    main()
