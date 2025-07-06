# LLM Logging Guide

## Overview

This guide explains the new LLM logging functionality that has been added to the Risk Dashboard system. Now you can see exactly what requests are sent to the LLM and what responses are received.

## Features

### 📋 What Gets Logged

1. **Request Information**
   - LLM provider (OpenAI or Azure OpenAI)
   - Model name used
   - Temperature setting
   - Number of messages in the request

2. **Message Content**
   - Each message with role (system, user, assistant)
   - Content preview (first 200 characters)
   - Full message content when debug mode is enabled

3. **Response Information**
   - Response length
   - Response preview (first 300 characters)
   - Full response content when debug mode is enabled
   - Token usage information (if available)

4. **Error Logging**
   - Detailed error messages when LLM calls fail
   - Request context when errors occur

### 📁 Log File Location

Logs are saved to: `backend/logs/llm_calls.log`

The log directory is automatically created when the system starts.

### 🔧 Configuration

#### Environment Variables

Add these to your `.env` file:

```bash
# Logging Configuration
DEBUG_MODE=true              # Set to true to log full LLM requests/responses
LOG_OPTIMIZATION_DETAILS=true  # Enable detailed optimization logging
```

#### Debug Mode Options

- `DEBUG_MODE=true`: Logs full LLM requests and responses
- `DEBUG_MODE=false`: Logs only previews and summaries (recommended for production)

## Usage

### 🧪 Testing the Logging

1. **Run the test script**:
   ```bash
   cd backend
   python test_llm_logging.py
   ```

2. **Check the log file**:
   ```bash
   cat backend/logs/llm_calls.log
   ```

### 📊 Monitoring LLM Calls

#### Real-time Monitoring
```bash
# Watch log file in real-time
tail -f backend/logs/llm_calls.log
```

#### Filtering Specific Information
```bash
# Show only LLM requests
grep "LLM REQUEST START" backend/logs/llm_calls.log

# Show only responses
grep "LLM RESPONSE RECEIVED" backend/logs/llm_calls.log

# Show only errors
grep "LLM REQUEST FAILED" backend/logs/llm_calls.log

# Show token usage
grep "Token usage" backend/logs/llm_calls.log
```

### 🔍 Log Entry Examples

#### Example Request Log
```
2024-01-15 10:30:45 - util - INFO - 🤖 LLM REQUEST START
2024-01-15 10:30:45 - util - INFO - Provider: openai
2024-01-15 10:30:45 - util - INFO - Model: gpt-4o
2024-01-15 10:30:45 - util - INFO - Temperature: 0.1
2024-01-15 10:30:45 - util - INFO - Messages count: 2
2024-01-15 10:30:45 - util - INFO - Message 1 (system): You are a financial risk analyst...
2024-01-15 10:30:45 - util - INFO - Message 2 (user): Analyze this news article for financial risks...
2024-01-15 10:30:45 - util - INFO - 📤 Sending request to LLM...
```

#### Example Response Log
```
2024-01-15 10:30:47 - util - INFO - 📥 LLM RESPONSE RECEIVED
2024-01-15 10:30:47 - util - INFO - Response length: 1543 characters
2024-01-15 10:30:47 - util - INFO - Response preview: {"primary_risk_category": "market_risk", "severity_level": "High"...
2024-01-15 10:30:47 - util - INFO - 💰 Token usage - Prompt: 450, Completion: 280, Total: 730
2024-01-15 10:30:47 - util - INFO - ✅ LLM REQUEST COMPLETED
```

## Integration with Existing Code

### 🔄 Automatic Integration

The logging is automatically integrated with all existing LLM calls through the `llm_call()` function in `util.py`. No changes needed to:

- `news_risk_analyzer.py`
- `evaluator_optimizer.py`
- `financial_risk_themes.py`
- `risk_dashboard_api.py`

### 📈 Performance Impact

- **Minimal performance impact**: Logging adds ~5-10ms per request
- **File I/O is asynchronous**: Won't block LLM calls
- **Log rotation**: Consider implementing log rotation for production use

## Troubleshooting

### 🚨 Common Issues

1. **Log file not created**
   - Check write permissions in the backend directory
   - Verify the logs directory exists

2. **No logs appearing**
   - Ensure logging is configured before any LLM calls
   - Check that `DEBUG_MODE` is set correctly

3. **Logs too verbose**
   - Set `DEBUG_MODE=false` to reduce log verbosity
   - Consider filtering logs with grep

### 🔧 Debugging Tips

1. **Check log file size**:
   ```bash
   ls -lh backend/logs/llm_calls.log
   ```

2. **View recent activity**:
   ```bash
   tail -20 backend/logs/llm_calls.log
   ```

3. **Count LLM calls**:
   ```bash
   grep -c "LLM REQUEST START" backend/logs/llm_calls.log
   ```

## Production Considerations

### 🛡️ Security
- Log files may contain sensitive information
- Consider encrypting log files in production
- Implement log rotation and retention policies

### 📊 Monitoring
- Monitor log file size growth
- Set up alerts for LLM call failures
- Track token usage for cost management

### 🔄 Log Rotation
Consider implementing log rotation:
```python
# Example log rotation configuration
import logging.handlers

handler = logging.handlers.RotatingFileHandler(
    'llm_calls.log',
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
```

## Next Steps

1. **Test the logging**: Run `python test_llm_logging.py`
2. **Monitor your system**: Watch the log file during normal operation
3. **Adjust settings**: Modify `DEBUG_MODE` based on your needs
4. **Implement monitoring**: Set up alerts for LLM failures

Now you have complete visibility into your LLM interactions! 🎉 