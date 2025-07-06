#!/usr/bin/env python3
"""
Huey Configuration with Multiple Backend Support
Supports both SQLite (development) and Redis (production/multiple consumers)
"""

import os
from huey import SqliteHuey, RedisHuey, MemoryHuey

def get_huey_instance():
    """
    Get Huey instance based on environment configuration.
    Supports SQLite (single consumer), Redis (multiple consumers), and Memory (testing).
    """
    
    # Get backend type from environment
    huey_backend = os.getenv('HUEY_BACKEND', 'sqlite').lower()
    
    if huey_backend == 'redis':
        # Redis backend - best for multiple consumers
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_db = int(os.getenv('REDIS_DB', 0))
        redis_password = os.getenv('REDIS_PASSWORD', None)
        
        print(f"🔧 Using Redis Huey backend: {redis_host}:{redis_port}/{redis_db}")
        
        return RedisHuey(
            name='news_risk_analyzer',
            host=redis_host,
            port=redis_port,
            db=redis_db,
            password=redis_password,
            # Multiple consumer optimizations
            blocking=True,  # Use blocking pop for efficiency
            read_timeout=1  # 1 second timeout for blocking reads
        )
    
    elif huey_backend == 'memory':
        # Memory backend - for testing only
        print("🔧 Using Memory Huey backend (testing only)")
        return MemoryHuey(name='news_risk_analyzer')
    
    else:
        # SQLite backend - single consumer only
        db_file = os.getenv('HUEY_DB_FILE', 'news_processing_queue.db')
        print(f"🔧 Using SQLite Huey backend: {db_file} (single consumer only)")
        print("⚠️  For multiple consumers, use HUEY_BACKEND=redis")
        
        return SqliteHuey(
            name='news_risk_analyzer',
            filename=db_file,
            # SQLite optimizations
            journal_mode='WAL',  # Write-Ahead Logging for better concurrency
            timeout=30  # 30 second timeout for database locks
        )

# Create the Huey instance
huey = get_huey_instance()

# Configuration for multiple consumers
CONSUMER_CONFIG = {
    'workers': int(os.getenv('HUEY_WORKERS', 2)),  # Number of worker processes per consumer
    'worker_type': os.getenv('HUEY_WORKER_TYPE', 'process'),  # 'process' or 'thread'
    'check_worker_health': True,
    'flush_locks': True,  # Clean up stale locks on startup
}

def print_consumer_info():
    """Print information about running multiple consumers"""
    backend = os.getenv('HUEY_BACKEND', 'sqlite').lower()
    workers = CONSUMER_CONFIG['workers']
    
    print(f"\n🔄 HUEY CONSUMER CONFIGURATION:")
    print(f"   Backend: {backend}")
    print(f"   Workers per consumer: {workers}")
    print(f"   Worker type: {CONSUMER_CONFIG['worker_type']}")
    
    if backend == 'sqlite':
        print(f"\n⚠️  SQLite Backend Limitations:")
        print(f"   - Only run ONE consumer instance")
        print(f"   - Multiple consumers will cause database locking issues")
        print(f"   - For multiple consumers, use: HUEY_BACKEND=redis")
    else:
        print(f"\n✅ Multiple Consumer Support:")
        print(f"   - Can run multiple consumer instances")
        print(f"   - Each instance will run {workers} worker processes")
        print(f"   - Use separate terminals or process managers")
        
    print(f"\n🚀 To start consumer:")
    print(f"   python -m huey.bin.huey_consumer news_risk_analyzer.huey -w {workers}")
    
    if backend == 'redis':
        print(f"\n📝 Multiple Consumer Example:")
        print(f"   Terminal 1: python -m huey.bin.huey_consumer news_risk_analyzer.huey -w {workers}")
        print(f"   Terminal 2: python -m huey.bin.huey_consumer news_risk_analyzer.huey -w {workers}")
        print(f"   Terminal 3: python -m huey.bin.huey_consumer news_risk_analyzer.huey -w {workers}")

if __name__ == "__main__":
    print_consumer_info() 