import sqlite3

conn = sqlite3.connect('risk_dashboard.db')
cursor = conn.execute("SELECT sql FROM sqlite_master WHERE type='view' AND name='dashboard_initial_load'")
result = cursor.fetchone()
if result:
    print('Current view SQL:')
    print(result[0])
    print('\nChecking if the view contains market_exposures...')
    if 'market_exposures' in result[0]:
        print('ERROR: View still contains market_exposures references!')
    else:
        print('OK: View does not contain market_exposures references.')
else:
    print('View does not exist')
conn.close()
