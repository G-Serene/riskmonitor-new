"""
News Publisher Script

This script queues news articles for processing by importing the worker module
to ensure consistent task registration.

Usage:
python news_publisher.py publish-all
python news_publisher.py publish-recent 24
"""

import sys
import os

# Import the worker module to get the tasks with correct naming
from news_risk_analyzer import (
    publish_all_news, 
    publish_recent_news, 
    queue_health_check, 
    get_dashboard_health,
    update_daily_risk_calculation
)

def main():
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "publish-all":
            publish_all_news()
        elif command == "publish-recent":
            hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24
            publish_recent_news(hours)
        elif command == "health-check":
            queue_health_check()
        elif command == "dashboard-health":
            get_dashboard_health()
        elif command == "update-risk":
            update_daily_risk_calculation()
        else:
            print("Available commands:")
            print("  publish-all       - Queue all news for processing")
            print("  publish-recent X  - Queue news from last X hours (default: 24)")
            print("  health-check      - Check queue system health")
            print("  dashboard-health  - Check dashboard data health")
            print("  update-risk       - Manually update daily risk calculation")
    else:
        # Default: publish all news
        publish_all_news()

if __name__ == "__main__":
    main()
