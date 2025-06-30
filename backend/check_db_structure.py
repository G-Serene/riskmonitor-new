#!/usr/bin/env python3
"""
Check database structure for dashboard_trending_topics
"""

import sqlite3

def check_database_structure():
    conn = sqlite3.connect('risk_dashboard.db')
    cursor = conn.cursor()
    
    # Check if dashboard_trending_topics is a table or view
    cursor.execute("SELECT type, name FROM sqlite_master WHERE name='dashboard_trending_topics'")
    result = cursor.fetchone()
    if result:
        print(f'dashboard_trending_topics is a {result[0]}')
        
        # If it's a view, show the SQL that creates it
        if result[0] == 'view':
            cursor.execute("SELECT sql FROM sqlite_master WHERE name='dashboard_trending_topics'")
            sql = cursor.fetchone()
            print(f'View SQL:\n{sql[0]}')
    else:
        print('dashboard_trending_topics not found')
    
    # List all views
    cursor.execute("SELECT name FROM sqlite_master WHERE type='view'")
    views = cursor.fetchall()
    print('\nAll views in database:')
    for view in views:
        print(f'  - {view[0]}')
    
    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print('\nAll tables in database:')
    for table in tables:
        print(f'  - {table[0]}')
    
    conn.close()

if __name__ == "__main__":
    check_database_structure()
