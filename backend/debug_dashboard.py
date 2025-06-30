#!/usr/bin/env python3
import sqlite3
import traceback

try:
    conn = sqlite3.connect('risk_dashboard.db')
    conn.row_factory = sqlite3.Row
    
    print('=== Checking if dashboard views exist ===')
    views = conn.execute("SELECT name FROM sqlite_master WHERE type='view' AND name LIKE 'dashboard%'").fetchall()
    for view in views:
        print(f'View: {view[0]}')
    
    print('\n=== Testing dashboard_initial_load view ===')
    try:
        result = conn.execute('SELECT * FROM dashboard_initial_load LIMIT 1').fetchone()
        if result:
            print('dashboard_initial_load view works')
            print(f'Columns: {list(result.keys())}')
        else:
            print('dashboard_initial_load view exists but returns no data')
    except Exception as e:
        print(f'Error with dashboard_initial_load: {e}')
    
    print('\n=== Testing other dashboard views ===')
    views_to_test = ['dashboard_trending_topics', 'dashboard_risk_breakdown', 'dashboard_geographic_risk']
    for view_name in views_to_test:
        try:
            result = conn.execute(f'SELECT * FROM {view_name} LIMIT 1').fetchone()
            print(f'{view_name}: OK')
        except Exception as e:
            print(f'{view_name}: ERROR - {e}')
    
    conn.close()
    
except Exception as e:
    print(f'Database connection error: {e}')
    traceback.print_exc()
