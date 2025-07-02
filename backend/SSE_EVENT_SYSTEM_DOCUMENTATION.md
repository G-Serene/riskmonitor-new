# Flexible SSE Event System Documentation

## 🎯 **Overview**

The Flexible SSE Event System solves the critical mismatch between backend event requirements and database constraints. It uses an **envelope pattern** to map 12+ backend event types to 4 database-allowed envelope types while preserving full event semantics.

## 🔧 **Architecture**

### **The Problem**
- **Database Schema**: Only allows 4 event types (`news_update`, `risk_change`, `alert_new`, `dashboard_refresh`)
- **Backend Needs**: Requires 12+ specific event types for rich functionality
- **Previous Solution**: Failed due to CHECK constraint violations

### **The Solution: Envelope Pattern**
```
Backend Event Type → Database Envelope → Frontend Receives Original Type
     ↓                      ↓                         ↓
news_feed_update → news_update envelope → news_feed_update
risk_score_update → risk_change envelope → risk_score_update
```

## 📦 **Event Type Mapping**

### **News Events → `news_update` Envelope**
- `news_update` - Individual news processing
- `news_feed_update` - Updated news feed lists

### **Risk Events → `risk_change` Envelope**  
- `risk_update` - General risk updates
- `risk_score_update` - Risk score changes
- `risk_breakdown_update` - Risk category breakdowns
- `risk_calculation_update` - Risk calculation updates

### **Alert Events → `alert_new` Envelope**
- `alerts_update` - Alert status updates
- `alert_new` - New critical alerts
- `error` - System errors and exceptions

### **Dashboard Events → `dashboard_refresh` Envelope**
- `dashboard_summary_update` - Dashboard metrics
- `sentiment_update` - Sentiment analysis updates
- `trending_topics_update` - Trending topics changes  
- `heatmap_update` - Geographic risk updates
- `connection` - Connection status events

## 🚀 **Usage Examples**

### **Emitting Events**
```python
from sse_event_system import emit_news_update, emit_risk_score_update

# News event
emit_news_update(
    news_id=123,
    headline="Market Volatility Increases",
    severity_level="High",
    source_name="Financial Times",
    published_date="2024-01-15T10:30:00Z"
)

# Risk event  
emit_risk_score_update(
    overall_risk_score=4.2,
    risk_trend="Rising",
    calculation_date="2024-01-15T10:35:00Z",
    contributing_factors=["Market Volatility", "Currency Fluctuation"]
)
```

### **Retrieving Events**
```python
from sse_event_system import SSEEventManager

# Get latest events
events = SSEEventManager.get_events_since(last_event_id=0, limit=50)

for event in events:
    print(f"Original Type: {event['original_event_type']}")
    print(f"Envelope Type: {event['envelope_type']}")  
    print(f"Priority: {event['priority']}")
    print(f"Data: {event['event_data']}")
```

## 🏗️ **Database Schema**

### **SSE Events Table**
```sql
CREATE TABLE sse_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL CHECK(event_type IN ('news_update', 'risk_change', 'alert_new', 'dashboard_refresh')),
    event_data TEXT NOT NULL,  -- JSON with envelope pattern
    priority INTEGER DEFAULT 50 CHECK(priority BETWEEN 1 AND 100),
    news_id INTEGER,
    processed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (news_id) REFERENCES news_articles(id) ON DELETE SET NULL
);
```

### **Envelope Pattern JSON Structure**
```json
{
  "original_event_type": "news_feed_update",
  "event_data": {
    "articles": [...],
    "triggered_by_event": 123,
    "action": "feed_updated"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "priority": 65,
  "envelope_type": "news_update"
}
```

## 📊 **Priority System**

Events are processed by priority (1-100, higher = more urgent):

| Priority | Event Types |
|----------|-------------|
| 90 | `error` |
| 85 | `alert_new` |
| 80 | `risk_update` |
| 75 | `risk_score_update` |
| 70 | `news_update` |
| 65 | `news_feed_update` |
| 60 | `dashboard_summary_update` |
| 55 | `risk_breakdown_update` |

| 35 | `alerts_update` |
| 30 | `connection` |

## 🔄 **Integration Points**

### **Backend Integration**
```python
# In risk_dashboard_api.py
from sse_event_system import emit_news_update

# When processing news
emit_news_update(
    news_id=article_id,
    headline=article.headline,
    severity_level=article.severity,
    source_name=article.source
)
```

### **Frontend Integration**
```typescript
// Frontend automatically handles envelope extraction
eventSource.addEventListener("news_feed_update", (event) => {
  const eventData = JSON.parse(event.data);
  
  // Extract from envelope pattern
  const extracted = extractEventData(eventData);
  const actualData = extracted.actualData;
  
  // Use actualData.articles normally
  updateNewsArticles(actualData.articles);
});
```

## 🧹 **Event Lifecycle Management**

### **Automatic Processing**
```python
# Events are automatically marked as processed
processed_events = SSEEventManager.get_events_since(last_id)
# ... handle events ...
SSEEventManager.mark_events_processed([event['event_id'] for event in processed_events])
```

### **Cleanup**
```python
# Remove old processed events (runs automatically)
removed_count = SSEEventManager.cleanup_old_events(days_old=7)
```

## 🎨 **Benefits**

### **✅ Solves Database Constraints**
- Respects CHECK constraint with 4 allowed envelope types
- No more constraint violation errors
- Maintains database integrity

### **✅ Preserves Rich Functionality**  
- All 9 backend event types supported
- Original event semantics preserved
- Full event metadata available

### **✅ Priority-Based Processing**
- Critical events processed first
- Configurable priority levels
- Optimized event handling

### **✅ Flexible & Extensible**
- Easy to add new event types
- Backward compatible
- Future-proof design

### **✅ Robust Error Handling**
- Graceful degradation
- Comprehensive logging
- Automatic retry mechanisms

## 🧪 **Testing**

Run the test suite:
```bash
python test_flexible_sse.py
```

### **Test Coverage**
- ✅ All event type mappings
- ✅ Priority system
- ✅ Envelope pattern encoding/decoding
- ✅ Event retrieval and processing
- ✅ Cleanup functionality
- ✅ Error handling

## 📈 **Performance**

### **Optimizations**
- **Batch Processing**: Multiple events retrieved at once
- **Priority Ordering**: High-priority events processed first  
- **Automatic Cleanup**: Old events removed automatically
- **Efficient JSON**: Minimal overhead for envelope pattern

### **Monitoring**
```python
# Event system provides detailed logging
📡 SSE Event emitted: news_feed_update → news_update (priority: 65)
✅ Marked 5 events as processed: True
🧹 Cleaned up 12 old SSE events
```

## 🔮 **Future Enhancements**

### **Planned Features**
1. **Event Compression**: Compress large event payloads
2. **Event Batching**: Batch similar events for efficiency
3. **Event Replay**: Replay events for debugging
4. **Event Analytics**: Track event patterns and performance
5. **Event Filtering**: Client-side event filtering
6. **Event Validation**: Schema validation for event payloads

### **Scalability Considerations**
- **Event Partitioning**: Partition events by type or date
- **Event Archiving**: Archive old events to separate storage
- **Event Streaming**: Direct streaming without database storage
- **Event Caching**: Cache frequently accessed events

## 🛠️ **Troubleshooting**

### **Common Issues**

**Issue**: Events not appearing in frontend
```python
# Check event emission
events = SSEEventManager.get_events_since(0)
print(f"Total events: {len(events)}")
```

**Issue**: Database constraint errors
```python
# Verify event type mapping
from sse_event_system import EVENT_MAPPING
print(EVENT_MAPPING.get('your_event_type'))
```

**Issue**: Performance problems
```python
# Check event cleanup
removed = SSEEventManager.cleanup_old_events(days_old=1)
print(f"Cleaned up {removed} events")
```

## 📚 **API Reference**

### **SSEEventManager**
- `emit_event(event_type, event_data, news_id=None, priority=None)` - Emit event
- `get_events_since(last_event_id, limit=50)` - Retrieve events
- `mark_events_processed(event_ids)` - Mark events as processed
- `cleanup_old_events(days_old=7)` - Clean up old events

### **Convenience Functions**
- `emit_news_update()` - Emit news update
- `emit_risk_score_update()` - Emit risk score update
- `emit_dashboard_summary_update()` - Emit dashboard update
- `emit_error_event()` - Emit error event
- And many more...

---

**🎉 The Flexible SSE Event System provides a robust, scalable solution that bridges the gap between backend requirements and database constraints while maintaining full functionality and performance.** 