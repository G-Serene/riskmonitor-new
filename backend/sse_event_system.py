#!/usr/bin/env python3
"""
Redesigned SSE Event System - Flexible Envelope Pattern
Maps rich backend events to database-constrained event types
"""
import json
from datetime import datetime
from contextlib import contextmanager
import sqlite3
from typing import Dict, Any, Optional, List

# Database-allowed event types (envelope categories)
DB_EVENT_TYPES = {
    'news_update',      # News processing, feed updates
    'risk_change',      # Risk calculations, scores, breakdowns  
    'alert_new',        # Critical alerts, system notifications
    'dashboard_refresh' # Dashboard data, trending topics, geographic
}

# Backend event mapping to database envelopes
EVENT_MAPPING = {
    # News-related events → news_update envelope
    'news_update': 'news_update',
    'news_feed_update': 'news_update',
    
    # Risk-related events → risk_change envelope  
    'risk_update': 'risk_change',
    'risk_score_update': 'risk_change',
    'risk_breakdown_update': 'risk_change',
    'risk_calculation_update': 'risk_change',
    
    # Alert-related events → alert_new envelope
    'alerts_update': 'alert_new',
    'alert_new': 'alert_new',
    'error': 'alert_new',
    
    # Dashboard-related events → dashboard_refresh envelope
    'dashboard_summary_update': 'dashboard_refresh',
    'connection': 'dashboard_refresh'
}

# Priority mapping for different event types
EVENT_PRIORITIES = {
    'error': 90,
    'alert_new': 85,
    'risk_update': 80,
    'risk_score_update': 75,
    'news_update': 70,
    'news_feed_update': 65,
    'dashboard_summary_update': 60,
    'risk_breakdown_update': 55,
    'alerts_update': 35,
    'connection': 30
}

@contextmanager
def get_risk_db_connection():
    """Get database connection for SSE events"""
    conn = sqlite3.connect('risk_dashboard.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

class SSEEventManager:
    """
    Manages SSE events with flexible envelope pattern
    """
    
    @staticmethod
    def emit_event(
        event_type: str,
        event_data: Dict[str, Any],
        news_id: Optional[int] = None,
        priority: Optional[int] = None
    ) -> bool:
        """
        Emit an SSE event using the envelope pattern
        
        Args:
            event_type: Original backend event type (e.g., 'news_feed_update')
            event_data: Event payload data
            news_id: Optional news article ID for tracking
            priority: Optional priority (1-100), auto-calculated if None
            
        Returns:
            bool: Success status
        """
        try:
            # Map to database-allowed envelope type
            db_event_type = EVENT_MAPPING.get(event_type, 'dashboard_refresh')
            
            # Calculate priority if not provided
            if priority is None:
                priority = EVENT_PRIORITIES.get(event_type, 50)
            
            # Create enriched event payload
            enriched_payload = {
                'original_event_type': event_type,  # Preserve original type
                'event_data': event_data,           # Original payload
                'timestamp': datetime.now().isoformat(),
                'priority': priority,
                'envelope_type': db_event_type
            }
            
            # Insert into database
            with get_risk_db_connection() as conn:
                conn.execute("""
                    INSERT INTO sse_events (
                        event_type, event_data, priority, news_id, created_at
                    ) VALUES (?, ?, ?, ?, datetime('now'))
                """, [
                    db_event_type,
                    json.dumps(enriched_payload),
                    priority,
                    news_id
                ])
                conn.commit()
                
            print(f"📡 SSE Event emitted: {event_type} → {db_event_type} (priority: {priority})")
            return True
            
        except Exception as e:
            print(f"❌ Failed to emit SSE event {event_type}: {e}")
            return False
    
    @staticmethod
    def get_events_since(last_event_id: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get SSE events since the given event ID
        
        Args:
            last_event_id: Last processed event ID
            limit: Maximum events to return
            
        Returns:
            List of processed events ready for SSE streaming
        """
        try:
            with get_risk_db_connection() as conn:
                events = conn.execute("""
                    SELECT event_id, event_type, event_data, priority, news_id, created_at
                    FROM sse_events 
                    WHERE event_id > ? 
                    ORDER BY priority DESC, event_id ASC
                    LIMIT ?
                """, [last_event_id, limit]).fetchall()
                
                processed_events = []
                for event in events:
                    try:
                        # Parse the enriched payload
                        payload = json.loads(event['event_data'])
                        
                        # Extract original event details
                        processed_event = {
                            'event_id': event['event_id'],
                            'envelope_type': event['event_type'],  # DB type
                            'original_event_type': payload.get('original_event_type', event['event_type']),
                            'event_data': payload.get('event_data', {}),
                            'priority': event['priority'],
                            'news_id': event['news_id'],
                            'timestamp': payload.get('timestamp', event['created_at']),
                            'created_at': event['created_at']
                        }
                        processed_events.append(processed_event)
                        
                    except json.JSONDecodeError as e:
                        print(f"⚠️ Failed to parse event {event['event_id']}: {e}")
                        continue
                
                return processed_events
                
        except Exception as e:
            print(f"❌ Failed to get SSE events: {e}")
            return []
    
    @staticmethod
    def mark_events_processed(event_ids: List[int]) -> bool:
        """
        Mark events as processed
        
        Args:
            event_ids: List of event IDs to mark as processed
            
        Returns:
            bool: Success status
        """
        try:
            with get_risk_db_connection() as conn:
                placeholders = ','.join('?' * len(event_ids))
                conn.execute(f"""
                    UPDATE sse_events 
                    SET processed = 1, processed_at = datetime('now')
                    WHERE event_id IN ({placeholders})
                """, event_ids)
                conn.commit()
                
            print(f"✅ Marked {len(event_ids)} events as processed")
            return True
            
        except Exception as e:
            print(f"❌ Failed to mark events as processed: {e}")
            return False
    
    @staticmethod
    def cleanup_old_events(days_old: int = 7) -> int:
        """
        Clean up old processed events
        
        Args:
            days_old: Remove events older than this many days
            
        Returns:
            int: Number of events removed
        """
        try:
            with get_risk_db_connection() as conn:
                result = conn.execute("""
                    DELETE FROM sse_events 
                    WHERE processed = 1 
                    AND created_at < datetime('now', '-{} days')
                """.format(days_old))
                conn.commit()
                
                removed_count = result.rowcount
                print(f"🧹 Cleaned up {removed_count} old SSE events")
                return removed_count
                
        except Exception as e:
            print(f"❌ Failed to cleanup old events: {e}")
            return 0

# Convenience functions for common event types
def emit_news_update(news_id: int, headline: str, severity_level: str, 
                    source_name: str, published_date: str, **kwargs):
    """Emit a news update event"""
    return SSEEventManager.emit_event(
        'news_update',
        {
            'news_id': news_id,
            'headline': headline,
            'severity_level': severity_level,
            'source_name': source_name,
            'published_date': published_date,
            'action': 'news_processed',
            **kwargs
        },
        news_id=news_id
    )

def emit_news_feed_update(articles: List[Dict], triggered_by_event: Optional[int] = None):
    """Emit a news feed update event"""
    return SSEEventManager.emit_event(
        'news_feed_update',
        {
            'articles': articles,
            'triggered_by_event': triggered_by_event,
            'action': 'feed_updated'
        }
    )

def emit_risk_score_update(overall_risk_score: float, risk_trend: str, 
                          calculation_date: str, contributing_factors: List[str]):
    """Emit a risk score update event"""
    return SSEEventManager.emit_event(
        'risk_score_update',
        {
            'overall_risk_score': overall_risk_score,
            'risk_trend': risk_trend,
            'calculation_date': calculation_date,
            'contributing_factors': contributing_factors,
            'action': 'risk_score_updated'
        }
    )

def emit_dashboard_summary_update(total_news_today: int, critical_count: int, 
                                 high_count: int, medium_count: int, low_count: int, 
                                 avg_sentiment: float, current_risk_score: float):
    """Emit a dashboard summary update event"""
    return SSEEventManager.emit_event(
        'dashboard_summary_update',
        {
            'total_news_today': total_news_today,
            'critical_count': critical_count,
            'high_count': high_count,
            'medium_count': medium_count,
            'low_count': low_count,
            'avg_sentiment': avg_sentiment,
            'current_risk_score': current_risk_score,
            'action': 'summary_updated'
        }
    )



def emit_risk_breakdown_update(breakdown: List[Dict]):
    """Emit risk breakdown update event"""
    return SSEEventManager.emit_event(
        'risk_breakdown_update',
        {
            'breakdown': breakdown,
            'action': 'breakdown_updated'
        }
    )





def emit_alerts_update(critical_count: int, last_check: str):
    """Emit alerts update event"""
    return SSEEventManager.emit_event(
        'alerts_update',
        {
            'critical_count': critical_count,
            'last_check': last_check,
            'action': 'alerts_updated'
        }
    )

def emit_connection_event(status: str = "connected", message: str = "SSE stream connected", 
                         last_event_id: int = 0):
    """Emit connection established event"""
    return SSEEventManager.emit_event(
        'connection',
        {
            'status': status,
            'message': message,
            'last_event_id': last_event_id,
            'action': 'connection_established'
        }
    )

def emit_error_event(error: str, context: Optional[str] = None):
    """Emit error event"""
    return SSEEventManager.emit_event(
        'error',
        {
            'error': error,
            'context': context,
            'action': 'error_occurred'
        }
    )

# Export the main class and convenience functions
__all__ = [
    'SSEEventManager',
    'emit_news_update',
    'emit_news_feed_update', 
    'emit_risk_score_update',
    'emit_dashboard_summary_update',
    'emit_risk_breakdown_update',
    'emit_alerts_update',
    'emit_connection_event',
    'emit_error_event'
] 