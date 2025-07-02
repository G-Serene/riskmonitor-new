#!/usr/bin/env python3
"""
Financial Risk Theme Classification System
Focused on negative financial news and banking/market risks only.
"""

# Financial Risk Theme Taxonomy (Comprehensive 12-Theme System)
FINANCIAL_RISK_THEMES = {
    "credit_crisis": {
        "display_name": "Credit Crisis",
        "description": "Bank lending, defaults, and credit market disruptions",
        "keywords": ["default", "credit", "loan", "mortgage", "debt", "bankruptcy", "npls"],
        "sub_themes": [
            "bank_loan_defaults",
            "corporate_bond_crisis", 
            "mortgage_market_collapse",
            "credit_rating_downgrades",
            "sovereign_debt_crisis"
        ]
    },
    
    "market_volatility": {
        "display_name": "Market Volatility Surge",
        "description": "Stock market crashes and asset price shocks",
        "keywords": ["crash", "volatility", "plunge", "sell-off", "bear market", "correction", "stock"],
        "sub_themes": [
            "stock_market_crash",
            "commodity_price_shock",
            "bond_market_turmoil",
            "crypto_market_collapse",
            "asset_price_bubble"
        ]
    },
    
    "currency_crisis": {
        "display_name": "Currency Crisis",
        "description": "Exchange rate volatility, currency devaluations, and FX market disruptions",
        "keywords": ["currency", "exchange rate", "fx", "devaluation", "currency crisis", "forex", "dollar", "euro"],
        "sub_themes": [
            "currency_devaluation",
            "fx_volatility_spike", 
            "emerging_market_currency_crisis",
            "dollar_strength_shock",
            "currency_intervention"
        ]
    },
    
    "interest_rate_shock": {
        "display_name": "Interest Rate Shock",
        "description": "Central bank policy changes and interest rate volatility",
        "keywords": ["interest rates", "fed policy", "monetary policy", "yield curve", "rate hikes", "rate cuts", "central bank"],
        "sub_themes": [
            "fed_rate_hike_shock",
            "negative_interest_rates",
            "yield_curve_inversion",
            "monetary_policy_reversal",
            "rate_volatility_spike"
        ]
    },
    
    "geopolitical_crisis": {
        "display_name": "Geopolitical Crisis",
        "description": "Wars, sanctions, political instability, and international conflicts",
        "keywords": ["war", "sanctions", "geopolitical", "conflict", "political crisis", "terrorism", "coup"],
        "sub_themes": [
            "war_outbreak",
            "sanctions_escalation",
            "political_instability",
            "terrorist_attacks",
            "diplomatic_crisis"
        ]
    },
    
    "trade_war_escalation": {
        "display_name": "Trade War Escalation", 
        "description": "Tariffs, trade disputes, and global trade disruptions",
        "keywords": ["tariff", "trade war", "embargo", "protectionism", "duties", "trade dispute"],
        "sub_themes": [
            "us_china_tariff_dispute",
            "eu_trade_barriers",
            "wto_disputes",
            "supply_chain_disruption",
            "export_restrictions"
        ]
    },
    
    "regulatory_crackdown": {
        "display_name": "Regulatory Crackdown",
        "description": "New regulations, compliance failures, and regulatory penalties",
        "keywords": ["regulation", "compliance", "penalty", "fine", "investigation", "crackdown"],
        "sub_themes": [
            "banking_regulation_tightening",
            "fintech_regulatory_action",
            "aml_compliance_failures",
            "data_privacy_violations",
            "market_manipulation_probes"
        ]
    },
    
    "cyber_security_breach": {
        "display_name": "Cyber Security Breach",
        "description": "Cyber attacks, data breaches, and digital infrastructure failures",
        "keywords": ["cyber", "hack", "breach", "ransomware", "malware", "data theft"],
        "sub_themes": [
            "banking_system_hack",
            "payment_network_breach",
            "customer_data_theft",
            "ransomware_attack",
            "digital_infrastructure_failure"
        ]
    },
    
    "liquidity_shortage": {
        "display_name": "Liquidity Shortage",
        "description": "Cash flow problems, funding stress, and liquidity crises",
        "keywords": ["liquidity", "cash flow", "funding", "repo", "margin call", "freeze"],
        "sub_themes": [
            "bank_run_panic",
            "repo_market_stress",
            "margin_call_cascade",
            "money_market_freeze",
            "central_bank_intervention"
        ]
    },
    
    "operational_disruption": {
        "display_name": "Operational Disruption", 
        "description": "System failures, outages, and operational risk events",
        "keywords": ["outage", "failure", "disruption", "error", "glitch", "breakdown"],
        "sub_themes": [
            "payment_system_failure",
            "trading_platform_outage",
            "core_banking_disruption",
            "settlement_delays",
            "data_center_failure"
        ]
    },
    
    "real_estate_crisis": {
        "display_name": "Real Estate Crisis",
        "description": "Property market crashes, mortgage crises, and real estate bubbles",
        "keywords": ["real estate", "property", "housing", "commercial property", "mortgage crisis", "property bubble"],
        "sub_themes": [
            "housing_market_crash",
            "commercial_property_collapse",
            "mortgage_defaults_surge",
            "property_bubble_burst",
            "reit_crisis"
        ]
    },
    
    "inflation_crisis": {
        "display_name": "Inflation Crisis",
        "description": "Price surges, hyperinflation, and monetary debasement affecting banking",
        "keywords": ["inflation", "hyperinflation", "price surge", "cost of living", "monetary debasement", "purchasing power"],
        "sub_themes": [
            "hyperinflation_outbreak",
            "wage_price_spiral",
            "cost_of_living_crisis",
            "monetary_debasement",
            "purchasing_power_collapse"
        ]
    },
    
    "sovereign_debt_crisis": {
        "display_name": "Sovereign Debt Crisis",
        "description": "Government debt defaults, fiscal crises, and sovereign risk events",
        "keywords": ["sovereign debt", "government default", "debt ceiling", "fiscal crisis", "bond yields", "sovereign risk"],
        "sub_themes": [
            "government_debt_default",
            "debt_ceiling_crisis",
            "fiscal_cliff",
            "sovereign_bond_collapse",
            "emerging_market_debt_crisis"
        ]
    },
    
    "supply_chain_crisis": {
        "display_name": "Supply Chain Crisis",
        "description": "Global supply chain disruptions affecting trade finance and commerce",
        "keywords": ["supply chain", "logistics crisis", "shipping disruption", "semiconductor shortage", "trade disruption"],
        "sub_themes": [
            "global_shipping_crisis",
            "semiconductor_shortage",
            "logistics_breakdown",
            "trade_route_disruption",
            "manufacturing_halt"
        ]
    },
    
    "esg_climate_risk": {
        "display_name": "ESG & Climate Risk",
        "description": "Climate change impacts, ESG regulations, and sustainability crises",
        "keywords": ["climate", "esg", "sustainability", "carbon", "green finance", "climate change", "environmental"],
        "sub_themes": [
            "climate_stress_tests",
            "esg_regulatory_mandates",
            "stranded_assets_crisis",
            "carbon_pricing_shock",
            "green_finance_disruption"
        ]
    },
    
    "systemic_banking_crisis": {
        "display_name": "Systemic Banking Crisis",
        "description": "Bank failures, contagion risk, and systemic financial instability", 
        "keywords": ["bank failure", "contagion", "systemic", "bailout", "fdic", "collapse"],
        "sub_themes": [
            "regional_bank_collapse",
            "too_big_to_fail_crisis",
            "deposit_insurance_strain",
            "interbank_contagion",
            "shadow_banking_crisis"
        ]
    },
    
    "other_financial_risks": {
        "display_name": "Other Financial Risks",
        "description": "Miscellaneous financial risks that don't fit specific categories",
        "keywords": [],  # No specific keywords - catch-all category
        "sub_themes": [
            "unclassified_financial_risk",
            "emerging_risk_patterns",
            "miscellaneous_banking_issues",
            "novel_financial_disruptions",
            "undefined_risk_events"
        ]
    }
}

def classify_news_theme(headline, content, risk_categories=None):
    """
    Classify news into financial risk themes using LLM-based analysis.
    
    Args:
        headline (str): News headline
        content (str): News content 
        risk_categories (list): Already identified risk categories (optional)
        
    Returns:
        dict: Theme classification result
    """
    try:
        # Import LLM utility
        from util import llm_call
        
        # Build theme options for LLM
        theme_options = []
        for theme_id, theme_info in FINANCIAL_RISK_THEMES.items():
            theme_options.append(f"- {theme_id}: {theme_info['display_name']} - {theme_info['description']}")
        
        # Create LLM prompt for theme classification
        prompt = f"""You are a financial risk analyst tasked with classifying news into specific financial risk themes.

AVAILABLE THEMES:
{chr(10).join(theme_options)}

NEWS TO CLASSIFY:
Headline: {headline}
Content: {content[:1000]}...

TASK:
Analyze this news article and classify it into ONE of the available themes above. Consider:
1. The primary financial risk being discussed
2. The main impact on banking/financial sector
3. The core nature of the risk event

Return your response in this exact JSON format:
{{
    "primary_theme": "theme_id_here",
    "confidence": 85,
    "reasoning": "Brief explanation of why this theme was chosen"
}}

Choose the theme that BEST matches the primary financial risk in this news. If none fit perfectly, choose "other_financial_risks"."""

        # Call LLM for classification
        response = llm_call(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-4o-mini",
            temperature=0.1
        )
        
        # Parse LLM response
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            llm_result = json.loads(json_match.group())
            
            theme_id = llm_result.get("primary_theme", "other_financial_risks")
            confidence = llm_result.get("confidence", 70)
            reasoning = llm_result.get("reasoning", "LLM classification")
            
            # Validate theme exists
            if theme_id not in FINANCIAL_RISK_THEMES:
                theme_id = "other_financial_risks"
                confidence = 30
                reasoning = "Invalid theme returned, using fallback"
            
            return {
                "primary_theme": theme_id,
                "theme_display_name": FINANCIAL_RISK_THEMES[theme_id]["display_name"],
                "confidence": min(max(confidence, 1), 100),  # Ensure 1-100 range
                "reasoning": reasoning,
                "method": "llm_classification"
            }
        else:
            raise ValueError("Invalid JSON response from LLM")
            
    except Exception as e:
        print(f"⚠️ LLM theme classification failed: {e}")
        # Fallback to keyword matching
        return classify_news_theme_fallback(headline, content, risk_categories)

def classify_news_theme_fallback(headline, content, risk_categories=None):
    """
    Fallback theme classification using keyword matching when LLM fails.
    """
    text = f"{headline} {content}".lower()
    
    # Score each theme based on keyword matches
    theme_scores = {}
    for theme_id, theme_info in FINANCIAL_RISK_THEMES.items():
        score = 0
        matched_keywords = []
        
        for keyword in theme_info["keywords"]:
            if keyword.lower() in text:
                score += 1
                matched_keywords.append(keyword)
        
        if score > 0:
            theme_scores[theme_id] = {
                "score": score,
                "matched_keywords": matched_keywords,
                "display_name": theme_info["display_name"],
                "description": theme_info["description"]
            }
    
    # Sort by score and return top match
    if theme_scores:
        best_theme = max(theme_scores.items(), key=lambda x: x[1]["score"])
        return {
            "primary_theme": best_theme[0],
            "theme_display_name": best_theme[1]["display_name"],
            "confidence": min(best_theme[1]["score"] * 20, 100),  # Max 100%
            "matched_keywords": best_theme[1]["matched_keywords"],
            "method": "keyword_fallback"
        }
    
    # Fallback to risk category mapping if no keywords match
    if risk_categories:
        risk_to_theme_map = {
            "credit_risk": "credit_crisis",
            "market_risk": "market_volatility", 
            "currency_risk": "currency_crisis",
            "exchange_risk": "currency_crisis",
            "fx_risk": "currency_crisis",
            "operational_risk": "operational_disruption",
            "cybersecurity_risk": "cyber_security_breach",
            "regulatory_risk": "regulatory_crackdown",
            "liquidity_risk": "liquidity_shortage",
            "systemic_risk": "systemic_banking_crisis",
            "interest_rate_risk": "interest_rate_shock",
            "geopolitical_risk": "geopolitical_crisis",
            "real_estate_risk": "real_estate_crisis",
            "climate_risk": "esg_climate_risk",
            "esg_risk": "esg_climate_risk",
            "inflation_risk": "inflation_crisis",
            "sovereign_risk": "sovereign_debt_crisis",
            "supply_chain_risk": "supply_chain_crisis"
        }
        
        for risk in risk_categories:
            if risk in risk_to_theme_map:
                theme_id = risk_to_theme_map[risk]
                return {
                    "primary_theme": theme_id,
                    "theme_display_name": FINANCIAL_RISK_THEMES[theme_id]["display_name"],
                    "confidence": 60,  # Medium confidence for fallback
                    "matched_keywords": [],
                    "method": "risk_category_fallback"
                }
    
    # Default fallback - use "Others" category
    return {
        "primary_theme": "other_financial_risks",
        "theme_display_name": "Other Financial Risks", 
        "confidence": 30,  # Low confidence
        "method": "default_fallback"
    }

def get_theme_statistics(db_path="risk_dashboard.db"):
    """Get theme distribution from database."""
    import sqlite3
    import json
    
    theme_stats = {}
    
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("""
                SELECT headline, content, risk_categories, primary_risk_category
                FROM news_articles 
                WHERE sentiment_score < 0  -- Only negative news
            """)
            
            for row in cursor.fetchall():
                headline, content, risk_cats_json, primary_risk = row
                risk_categories = json.loads(risk_cats_json) if risk_cats_json else []
                
                # Classify into theme
                theme_result = classify_news_theme(headline, content, risk_categories)
                theme = theme_result["primary_theme"]
                
                if theme not in theme_stats:
                    theme_stats[theme] = {
                        "count": 0,
                        "display_name": theme_result["theme_display_name"],
                        "articles": []
                    }
                
                theme_stats[theme]["count"] += 1
                theme_stats[theme]["articles"].append({
                    "headline": headline[:100],
                    "confidence": theme_result["confidence"]
                })
        
        return theme_stats
        
    except Exception as e:
        print(f"Error getting theme statistics: {e}")
        return {}

# Example testing and validation
if __name__ == "__main__":
    # Test LLM-based theme classification
    test_examples = [
        {
            "headline": "Trump announces 60% tariffs on Chinese goods, markets plunge",
            "content": "President Trump announced sweeping tariffs on Chinese imports, causing massive market selloff and currency volatility across global markets."
        },
        {
            "headline": "Fed raises rates 0.75%, bank margins under pressure",
            "content": "Federal Reserve announces aggressive interest rate hike, threatening bank profitability and loan demand across the financial sector."
        },
        {
            "headline": "Major European bank hacked, customer data exposed",
            "content": "Cybersecurity breach compromises millions of banking records, raising concerns about digital infrastructure security in the financial sector."
        },
        {
            "headline": "Turkish lira collapses 40% amid currency crisis fears",
            "content": "Exchange rate volatility and currency devaluation create massive FX exposure for international banks operating in emerging markets."
        },
        {
            "headline": "Regional bank failure sparks contagion fears",
            "content": "Silicon Valley Bank collapse triggers systemic concerns about deposit insurance and potential contagion across the banking sector."
        }
    ]
    
    print("🎯 LLM-Based Financial Risk Theme Classification:")
    print("=" * 70)
    
    for i, example in enumerate(test_examples, 1):
        print(f"\n📰 Example {i}:")
        print(f"   Headline: {example['headline']}")
        
        try:
            result = classify_news_theme(example["headline"], example["content"])
            
            print(f"   ✅ Primary Theme: {result['theme_display_name']}")
            print(f"   🎯 Confidence: {result['confidence']}%")
            print(f"   � Method: {result.get('method', 'unknown')}")
            
            if 'reasoning' in result:
                print(f"   💭 Reasoning: {result['reasoning']}")
                
        except Exception as e:
            print(f"   ❌ Classification failed: {e}")
    
    print(f"\n✅ LLM-powered theme classification provides intelligent analysis!")
    print(f"📊 Total Available Themes: {len(FINANCIAL_RISK_THEMES)}")
    theme_names = [info['display_name'] for info in FINANCIAL_RISK_THEMES.values()]
    print(f"🎯 Available Themes: {', '.join(theme_names[:8])}...")  # Show first 8
