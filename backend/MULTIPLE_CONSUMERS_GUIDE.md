# Multiple Huey Consumers Setup Guide

This guide explains how to run multiple Huey consumers for improved processing throughput in the Risk Monitor system.

## Current Limitation

Your current setup uses **SQLite backend** which only supports **1 consumer** due to database locking issues. To run multiple consumers, you need to switch to **Redis backend**.

## Option 1: Redis Backend (Recommended for Multiple Consumers)

### Prerequisites

1. **Install Redis Server**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # macOS (Homebrew)
   brew install redis
   
   # Windows (Docker)
   docker run -d -p 6379:6379 redis:latest
   
   # Or download from: https://redis.io/download
   ```

2. **Install Python Redis Package**:
   ```bash
   pip install redis>=5.0.0
   ```

### Configuration

1. **Set Environment Variables**:
   ```bash
   # In your .env file or environment
   HUEY_BACKEND=redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_DB=0
   # REDIS_PASSWORD=your_password  # If Redis has auth
   
   # Optional: Configure worker settings
   HUEY_WORKERS=2  # Workers per consumer instance
   HUEY_WORKER_TYPE=process  # 'process' or 'thread'
   ```

2. **Start Redis Server**:
   ```bash
   # Ubuntu/Debian/macOS
   redis-server
   
   # Or if installed via package manager
   sudo systemctl start redis-server
   
   # Windows (if using Docker)
   # Already running from docker command above
   ```

### Running Multiple Consumers

With Redis backend, you can run multiple consumer instances:

```bash
# Terminal 1 - Consumer Instance 1
cd backend
python -m huey.bin.huey_consumer news_risk_analyzer.huey -w 2

# Terminal 2 - Consumer Instance 2  
cd backend
python -m huey.bin.huey_consumer news_risk_analyzer.huey -w 2

# Terminal 3 - Consumer Instance 3
cd backend
python -m huey.bin.huey_consumer news_risk_analyzer.huey -w 2
```

### Process Manager Setup (Production)

For production, use a process manager like **systemd**, **supervisor**, or **pm2**:

#### Systemd Example:
```ini
# /etc/systemd/system/risk-monitor-consumer@.service
[Unit]
Description=Risk Monitor Huey Consumer %i
After=network.target redis.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/riskmonitor/backend
Environment=HUEY_BACKEND=redis
Environment=HUEY_WORKERS=2
ExecStart=python -m huey.bin.huey_consumer news_risk_analyzer.huey -w 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start multiple instances:
```bash
sudo systemctl enable risk-monitor-consumer@1.service
sudo systemctl enable risk-monitor-consumer@2.service
sudo systemctl enable risk-monitor-consumer@3.service

sudo systemctl start risk-monitor-consumer@1.service
sudo systemctl start risk-monitor-consumer@2.service
sudo systemctl start risk-monitor-consumer@3.service
```

## Option 2: Improved SQLite Setup (Single Consumer)

If you prefer to stick with SQLite, you can optimize it for better performance:

### Configuration
```bash
# In your .env file
HUEY_BACKEND=sqlite
HUEY_DB_FILE=news_processing_queue.db
HUEY_WORKERS=4  # More workers in single consumer process
```

### Optimizations Applied
- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Increased Timeout**: 30-second timeout for database locks
- **More Workers**: Run multiple worker processes in single consumer

### Running Single Optimized Consumer
```bash
cd backend
python -m huey.bin.huey_consumer news_risk_analyzer.huey -w 4
```

## Option 3: Memory Backend (Development/Testing)

For development or testing without persistence:

```bash
# In your .env file
HUEY_BACKEND=memory
HUEY_WORKERS=2
```

**Note**: Tasks are lost when consumer stops.

## Performance Comparison

| Backend | Max Consumers | Persistence | Setup Complexity | Performance |
|---------|---------------|-------------|------------------|-------------|
| SQLite  | 1             | ✅ Yes      | 🟢 Simple       | 🟡 Medium   |
| Redis   | Unlimited     | ✅ Yes      | 🟡 Medium       | 🟢 High     |
| Memory  | Unlimited     | ❌ No       | 🟢 Simple       | 🟢 High     |

## Monitoring Multiple Consumers

### Check Consumer Status
```bash
# Check Huey configuration
cd backend
python huey_config.py

# Monitor Redis (if using Redis backend)
redis-cli monitor

# Check consumer processes
ps aux | grep huey_consumer
```

### Health Checks
```python
# In your application
from huey_config import huey

# Check queue size
queue_size = len(huey)
print(f"Tasks in queue: {queue_size}")

# Health check endpoint
# GET /api/health will include Huey status
```

## Troubleshooting

### SQLite Locking Issues
```
Error: database is locked
```
**Solution**: Use Redis backend or reduce to single consumer.

### Redis Connection Issues
```
Error: Connection refused
```
**Solution**: 
1. Ensure Redis server is running: `redis-cli ping`
2. Check Redis configuration
3. Verify environment variables

### Consumer Not Processing Tasks
1. Check if consumer is running: `ps aux | grep huey`
2. Verify task registration: `python -c "from news_risk_analyzer import huey; print(huey)"`
3. Check queue status: `redis-cli llen news_risk_analyzer`

## Quick Setup Commands

### For Redis (Multiple Consumers):
```bash
# Install Redis
sudo apt-get install redis-server  # or brew install redis

# Install Python Redis
pip install redis>=5.0.0

# Set environment
echo "HUEY_BACKEND=redis" >> .env

# Start Redis
redis-server

# Start multiple consumers (separate terminals)
python -m huey.bin.huey_consumer news_risk_analyzer.huey -w 2
```

### For Optimized SQLite (Single Consumer):
```bash
# Set environment
echo "HUEY_BACKEND=sqlite" >> .env
echo "HUEY_WORKERS=4" >> .env

# Start single consumer with more workers
python -m huey.bin.huey_consumer news_risk_analyzer.huey -w 4
```

## Recommended Production Setup

For production with high throughput:

1. **Use Redis backend**
2. **Run 3-5 consumer instances**
3. **2-4 workers per instance**
4. **Use process manager (systemd/supervisor)**
5. **Monitor with Redis monitoring tools**
6. **Set up health checks and alerting**

Total processing capacity: **6-20 parallel workers** 🚀 