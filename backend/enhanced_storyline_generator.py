#!/usr/bin/env python3
"""
Enhanced Storyline Generation System
Handles large article volumes and creates comprehensive banking risk storylines.
"""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import random

def smart_article_selection(articles: List[Dict], max_articles: int = 25) -> List[Dict]:
    """
    Intelligently select representative articles from a large dataset.
    Prioritizes by severity, recency, and diversity.
    """
    if len(articles) <= max_articles:
        return articles
    
    # Sort by importance: severity + risk score + recency
    sorted_articles = sorted(articles, key=lambda x: (
        {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}.get(x.get("severity_level", "Low"), 1),
        x.get("overall_risk_score", 0),
        datetime.fromisoformat(x.get("published_date", "2020-01-01")).timestamp()
    ), reverse=True)
    
    # Take top articles by importance
    top_articles = sorted_articles[:max_articles//2]
    
    # Add some recent articles for timeline diversity
    recent_articles = sorted_articles[:max_articles][-max_articles//3:]
    
    # Add some geographic/market diversity
    remaining = [a for a in sorted_articles if a not in top_articles and a not in recent_articles]
    diverse_articles = []
    seen_countries = set()
    seen_markets = set()
    
    for article in remaining:
        countries = article.get("countries", [])
        markets = article.get("affected_markets", [])
        
        # Add if it introduces new geographic/market coverage
        new_countries = set(countries) - seen_countries
        new_markets = set(markets) - seen_markets
        
        if new_countries or new_markets or len(diverse_articles) < max_articles//4:
            diverse_articles.append(article)
            seen_countries.update(countries)
            seen_markets.update(markets)
            
        if len(diverse_articles) >= max_articles//4:
            break
    
    # Combine all selected articles
    selected = list(set(top_articles + recent_articles + diverse_articles))
    
    # Ensure we don't exceed max_articles
    if len(selected) > max_articles:
        selected = selected[:max_articles]
    
    # Sort by date for chronological analysis
    return sorted(selected, key=lambda x: x.get("published_date", "2020-01-01"))

def create_storyline_context(articles: List[Dict], theme_name: str) -> Dict[str, Any]:
    """
    Create comprehensive context for storyline generation.
    """
    countries_set = set()
    markets_set = set()
    severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    
    timeline = []
    cross_linkages = []
    
    for article in articles:
        # Aggregate geographic and market data
        if article.get("countries"):
            if isinstance(article["countries"], str):
                countries = json.loads(article["countries"])
            else:
                countries = article["countries"]
            countries_set.update(countries)
        
        if article.get("affected_markets"):
            if isinstance(article["affected_markets"], str):
                markets = json.loads(article["affected_markets"])
            else:
                markets = article["affected_markets"]
            markets_set.update(markets)
        
        # Count severity levels
        severity = article.get("severity_level", "Low")
        if severity in severity_counts:
            severity_counts[severity] += 1
        
        # Build timeline entry
        timeline.append({
            "date": article.get("published_date"),
            "headline": article.get("headline"),
            "severity": severity,
            "risk_score": article.get("overall_risk_score", 0),
            "countries": article.get("countries", [])
        })
    
    # Identify cross-linkages (same countries/markets appearing across articles)
    country_appearances = {}
    market_appearances = {}
    
    for article in articles:
        countries = article.get("countries", [])
        markets = article.get("affected_markets", [])
        
        for country in countries:
            if country not in country_appearances:
                country_appearances[country] = []
            country_appearances[country].append(article.get("headline", ""))
        
        for market in markets:
            if market not in market_appearances:
                market_appearances[market] = []
            market_appearances[market].append(article.get("headline", ""))
    
    # Find significant cross-linkages (appearing in 2+ articles)
    significant_countries = {k: v for k, v in country_appearances.items() if len(v) >= 2}
    significant_markets = {k: v for k, v in market_appearances.items() if len(v) >= 2}
    
    return {
        "theme_name": theme_name,
        "article_count": len(articles),
        "date_range": {
            "start": min(a.get("published_date", "") for a in articles),
            "end": max(a.get("published_date", "") for a in articles)
        },
        "geographic_scope": {
            "countries": list(countries_set),
            "country_count": len(countries_set),
            "cross_country_events": significant_countries
        },
        "market_scope": {
            "markets": list(markets_set),
            "market_count": len(markets_set),
            "cross_market_events": significant_markets
        },
        "severity_distribution": severity_counts,
        "timeline": timeline[:10],  # Most recent 10 for context
        "avg_risk_score": sum(a.get("overall_risk_score", 0) for a in articles) / len(articles),
        "max_risk_score": max(a.get("overall_risk_score", 0) for a in articles)
    }

def generate_comprehensive_storyline_prompt(context: Dict[str, Any], articles: List[Dict]) -> str:
    """
    Generate a comprehensive prompt for LLM storyline creation.
    """
    
    # Create executive summary data
    exec_data = f"""
THEME: {context['theme_name']}
SCOPE: {context['article_count']} articles over {context['date_range']['start']} to {context['date_range']['end']}
GEOGRAPHIC REACH: {context['geographic_scope']['country_count']} countries
MARKET IMPACT: {context['market_scope']['market_count']} market sectors
SEVERITY BREAKDOWN: {context['severity_distribution']['Critical']} Critical, {context['severity_distribution']['High']} High, {context['severity_distribution']['Medium']} Medium, {context['severity_distribution']['Low']} Low
AVERAGE RISK SCORE: {context['avg_risk_score']:.1f}/10
"""

    # Key articles for analysis
    key_articles = articles[:8]  # Top 8 most important
    article_summaries = []
    
    for i, article in enumerate(key_articles, 1):
        article_summaries.append(f"""
{i}. {article.get('headline', 'No headline')}
   Date: {article.get('published_date', 'Unknown')}
   Severity: {article.get('severity_level', 'Low')} | Risk Score: {article.get('overall_risk_score', 0):.1f}
   Summary: {article.get('summary', 'No summary')[:200]}...
   Countries: {', '.join(article.get('countries', [])[:3])}
""")
    
    # Cross-linkage analysis
    cross_linkages = []
    if context['geographic_scope']['cross_country_events']:
        cross_linkages.append("GEOGRAPHIC CROSS-LINKAGES:")
        for country, events in list(context['geographic_scope']['cross_country_events'].items())[:5]:
            cross_linkages.append(f"• {country}: {len(events)} related events")
    
    if context['market_scope']['cross_market_events']:
        cross_linkages.append("MARKET CROSS-LINKAGES:")
        for market, events in list(context['market_scope']['cross_market_events'].items())[:5]:
            cross_linkages.append(f"• {market}: {len(events)} related events")

    prompt = f"""
You are a senior financial risk analyst at a major international bank, tasked with creating a comprehensive risk storyline for the executive committee.

=== SITUATION OVERVIEW ===
{exec_data}

=== KEY DEVELOPMENTS ===
{chr(10).join(article_summaries)}

=== CROSS-LINKAGE ANALYSIS ===
{chr(10).join(cross_linkages)}

=== TASK ===
Create a professional, executive-level risk storyline that connects these events into a coherent narrative. Focus on:

1. **EXECUTIVE SUMMARY** (3-4 sentences)
   - What is the core risk story?
   - Why should senior management care?
   - What's the bottom line for our bank?

2. **RISK DEVELOPMENT TIMELINE** 
   - How did this theme emerge and evolve?
   - What were the key trigger events?
   - What accelerated the risks?

3. **CROSS-LINKAGE ANALYSIS**
   - How are different events/regions interconnected?
   - What are the contagion pathways?
   - Where do we see domino effects?

4. **BANKING SECTOR IMPACT ASSESSMENT**
   - Direct impacts on international banks
   - Operational risk implications
   - Credit risk considerations
   - Market risk exposures
   - Regulatory compliance issues

5. **FORWARD-LOOKING RISK ASSESSMENT**
   - What trends are likely to continue?
   - What new risks might emerge?
   - What are the tail risks?
   - Time horizon for impacts

6. **STRATEGIC RECOMMENDATIONS**
   - Immediate actions required
   - Medium-term risk mitigation
   - Monitoring priorities
   - Stress testing scenarios

=== OUTPUT REQUIREMENTS ===
- Executive-level language (senior management audience)
- Quantify impacts where possible
- Include specific bank business line implications
- Provide actionable insights
- Maximum 1,500 words
- Professional tone with urgency where appropriate

=== CRITICAL FOCUS AREAS ===
- International banking operations
- Cross-border transaction risks
- Regulatory compliance across jurisdictions
- Credit portfolio impacts
- Operational resilience
- Reputational risk considerations
"""

    return prompt

def create_downloadable_report_data(storyline: str, context: Dict[str, Any], articles: List[Dict]) -> Dict[str, Any]:
    """
    Create comprehensive data structure for downloadable report.
    """
    
    return {
        "report_metadata": {
            "title": f"Risk Storyline Report: {context['theme_name']}",
            "generated_at": datetime.now().isoformat(),
            "report_id": f"RSR-{context['theme_name'].replace(' ', '-').upper()}-{datetime.now().strftime('%Y%m%d')}",
            "analyst": "AI Risk Analytics System",
            "classification": "CONFIDENTIAL - INTERNAL USE ONLY"
        },
        "executive_summary": {
            "theme": context['theme_name'],
            "article_count": context['article_count'],
            "date_range": context['date_range'],
            "severity_distribution": context['severity_distribution'],
            "geographic_scope": context['geographic_scope']['country_count'],
            "market_scope": context['market_scope']['market_count'],
            "avg_risk_score": context['avg_risk_score'],
            "max_risk_score": context['max_risk_score']
        },
        "storyline_content": storyline,
        "supporting_data": {
            "key_countries": context['geographic_scope']['countries'][:10],
            "key_markets": context['market_scope']['markets'][:10],
            "cross_linkages": {
                "countries": context['geographic_scope']['cross_country_events'],
                "markets": context['market_scope']['cross_market_events']
            },
            "timeline": context['timeline']
        },
        "article_references": [
            {
                "id": article.get("id"),
                "headline": article.get("headline"),
                "source": article.get("source_name"),
                "date": article.get("published_date"),
                "severity": article.get("severity_level"),
                "risk_score": article.get("overall_risk_score"),
                "countries": article.get("countries", [])
            }
            for article in articles[:20]  # Top 20 articles for reference
        ],
        "risk_metrics": {
            "total_articles_analyzed": len(articles),
            "critical_articles": len([a for a in articles if a.get("severity_level") == "Critical"]),
            "high_risk_articles": len([a for a in articles if a.get("severity_level") == "High"]),
            "avg_risk_score": context['avg_risk_score'],
            "risk_distribution": context['severity_distribution']
        }
    }
