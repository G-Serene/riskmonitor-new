# Development Utilities

## Quick Reset & Testing Commands

### 🚨 Reset Everything (Development Only)
```bash
python dev_utils.py reset
```
- Clears all processed news tables
- Resets all raw news to unprocessed state  
- Clears Huey task queue
- Gives you a fresh start for testing

### 📊 Check System Status
```bash
python dev_utils.py status
```
- Shows comprehensive system status
- Raw news counts (total, processed, unprocessed)
- Processed news breakdown by severity
- Recent unprocessed articles

### 🧪 Add Test News Articles
```bash
python dev_utils.py add-test 3    # Add 3 test articles
python dev_utils.py add-test      # Add 1 test article
```
- Adds realistic test banking news articles
- Articles will be automatically processed within 1 minute
- Great for testing the automation pipeline

### 🔍 Live System Monitoring
```bash
python dev_utils.py monitor
```
- Live real-time monitoring of processing
- Updates every 5 seconds
- Shows processing progress as it happens
- Press Ctrl+C to stop

## Typical Development Workflow

1. **Reset system**: `python dev_utils.py reset`
2. **Add test data**: `python dev_utils.py add-test 5`
3. **Monitor processing**: `python dev_utils.py monitor`
4. **Check final status**: `python dev_utils.py status`

## System Components Status

- ✅ **Automatic Processing**: Periodic task runs every 1 minute
- ✅ **OpenAI Integration**: Articles analyzed for banking risk
- ✅ **Dashboard Updates**: Processed articles appear in dashboard
- ✅ **Duplicate Prevention**: Processed flag prevents reprocessing
- ✅ **Real-time Monitoring**: Live status updates

## Production vs Development

- **Development**: Use these utilities for testing and debugging
- **Production**: System runs automatically, no manual resets needed
- **Safety**: Reset functions only affect test/development data

The automation pipeline is working perfectly! 🎉
