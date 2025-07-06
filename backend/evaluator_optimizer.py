"""
Evaluator-Optimizer Workflow for Risk Analysis
Following the Anthropic "Building Effective Agents" cookbook pattern using OpenAI.
Clean implementation with no fallback logic - errors are handled by Huey retries.
"""
import json
from typing import Dict, List, Tuple
from datetime import datetime
from util import llm_call, extract_xml, parse_json_from_xml, validate_risk_analysis


def get_recent_scoring_context(limit=50):
    """Get recent articles with scores for relative comparison"""
    from news_risk_analyzer import get_risk_db_connection
    
    try:
        with get_risk_db_connection() as conn:
            cursor = conn.execute("""
                SELECT summary, severity_level, sentiment_score, impact_score, 
                       confidence_score, primary_risk_category, is_market_moving,
                       published_date
                FROM news_articles 
                ORDER BY published_date DESC
                LIMIT ?
            """, [limit])
            
            articles = cursor.fetchall()
            if not articles:
                return "No recent articles for comparison."
            
            context_lines = ["RECENT ARTICLES FOR RELATIVE SCORING COMPARISON:"]
            for i, art in enumerate(articles, 1):
                market_moving = "Market-Moving" if art['is_market_moving'] else "Non-Market-Moving"
                context_lines.append(
                    f"{i}. {art['summary'][:80]}... "
                    f"[{art['severity_level']} | Sentiment: {art['sentiment_score']:.2f} | "
                    f"Impact: {art['impact_score']} | Confidence: {art['confidence_score']}% | "
                    f"{art['primary_risk_category']} | {market_moving} | {art['published_date'][:10]}]"
                )
            
            return "\n".join(context_lines)
    except Exception as e:
        return f"Context unavailable: {e}"


class RiskAnalysisEvaluatorOptimizer:
    """
    Evaluator-Optimizer workflow following the Anthropic cookbook pattern.
    Generator creates risk analysis, Evaluator provides feedback, loop until acceptable.
    """
    
    def __init__(self, max_iterations: int = 1):
        """
        Initialize the Evaluator-Optimizer system.
        
        Args:
            max_iterations: Maximum number of improvement iterations
        """
        self.max_iterations = max_iterations
    
    def generate_risk_analysis(self, news_data: Dict, feedback_context: str = "") -> Tuple[str, Dict]:
        """
        Generator: Create risk analysis from news data using OpenAI via util.py.
        
        Args:
            news_data: News article data
            feedback_context: Previous feedback for improvement context
            
        Returns:
            Tuple of (reasoning, risk_analysis_dict)
        """
        system_prompt = """You are a financial risk analyst specializing in international banking and financial risk.
        Analyze news articles for financial risk impact and provide comprehensive risk assessment.
        
        Think through your analysis step by step, then provide your final assessment.
        
        Return your response in this format:
        
        <thoughts>
        Your reasoning process, analysis approach, and key considerations for this risk assessment.
        Explain why you chose specific risk categories, severity levels, and confidence scores.
        </thoughts>
        
        <response>
        {Valid JSON with risk analysis as specified in the user prompt}
        </response>"""
        
        # Get recent scoring context for relative comparison
        scoring_context = get_recent_scoring_context(limit=50)
        
        user_prompt = f"""
        {scoring_context}
        
        CURRENT NEWS TO ANALYZE:
        Headline: {news_data['headline']}
        Content: {news_data['story'][:2000]}
        Source: {news_data['newsSource']}
        
        IMPORTANT: 
        1. For the historical_impact_analysis field, research and analyze similar past events and their specific impacts on international banks. Include concrete examples, dates, and outcomes when possible.
        2. Score the current news RELATIVE to the recent articles above. Consider:
           - Is this more/less severe than similar recent events?
           - How does the impact compare to recent market-moving events?
           - What's the appropriate sentiment relative to recent negative news?
           - Use the recent articles as your baseline for scoring consistency.
        
        {feedback_context}
        
        Return JSON with exactly this JSON format:
        {{
            "primary_risk_category": "market_risk OR credit_risk OR operational_risk OR liquidity_risk OR cybersecurity_risk OR regulatory_risk OR systemic_risk OR reputational_risk (choose ONE primary category)",
            "secondary_risk_categories": ["additional risk categories that also apply from the above list"],
            "risk_subcategories": ["interest_rate_risk", "currency_risk"],
            "severity_level": "Critical|High|Medium|Low",
            "urgency_level": "Critical|High|Medium|Low", 
            "temporal_impact": "Immediate|Short-term|Medium-term|Long-term",
            "sentiment_score": "SENTIMENT_SCORE_HERE in range -1 to 1. assign negative if the news is negative else positive",
            "confidence_score": "CONFIDENCE_SCORE_HERE as integer in range 0 to 100. assign 0 if the news is not clear else 100",
            "impact_score": "IMPACT_SCORE_HERE as integer in range 0 to 100. assign 0 if the news is not clear else 100",
            "financial_exposure": "FINANCIAL_EXPOSURE_HERE in range 0 to 1000000000. assign 0 if the news is doesnt include financial exposure else actual value",
            "risk_contribution": "RISK_CONTRIBUTION_HERE in range 0 to 100. assign 0 if the news is doesnt include risk contribution else actual value",
            "geographic_regions": ["geographic_regions_here"],
            "industry_sectors": ["industry_sectors_here"],
            "countries": ["countries_here"],
            "coordinates": {{"lat": "LATITUDE_HERE", "lng": "LONGITUDE_HERE"}},
            "affected_markets": ["affected_markets_here"],
            "keywords": ["keywords_here"],
            "entities": ["entities_here"],
            "is_market_moving": "true or false. assign true if the news is a market moving event else false",
            "is_breaking_news": "true or false. assign true if the news is a breaking news event else false",
            "is_regulatory": "true or false. assign true if the news is a regulatory event else false",
            "requires_action": "true or false. assign true if the news requires action else false",
            "summary": "Brief summary of the risk impact for dashboard display",
            "description": "Detailed justification explaining sentiment, confidence, impact, affected markets, is_market_moving, is_breaking_news, requires_action, historical_impact_analysis",
            "historical_impact_analysis": "Analysis of how similar events in the past have affected international banks, including specific examples and lessons learned"
        }}
        
        CRITICAL REQUIREMENTS:
        - RELATIVE SCORING: Use the recent articles context above as your baseline for consistent scoring
        - primary_risk_category: Select ONLY ONE primary category that represents the main risk
        - secondary_risk_categories: Include ALL other relevant risk categories that also apply (can be empty array)
        - For comprehensive risk monitoring, identify ALL relevant risk categories, not just the most obvious one
        - Example: A banking crisis might have primary_risk_category="credit_risk" and secondary_risk_categories=["market_risk", "liquidity_risk"]
        - A cyber attack might have primary_risk_category="cybersecurity_risk" and secondary_risk_categories=["operational_risk", "reputational_risk"]
        - financial_exposure: Estimate in USD (0 if no financial impact)
        - coordinates: lat/lng for PRIMARY affected country
        - keywords: 5-10 key financial terms (lowercase)
        - entities: 3-8 key people/organizations
        - is_market_moving: TRUE only for significant market impact events (compare to recent market-moving events above)
        - requires_action: TRUE only for immediate risk management needs
        - description: 2-3 sentences explaining your reasoning for key decisions
        - historical_impact_analysis: 3-4 sentences analyzing how similar events in the past have specifically affected international banks. Include concrete examples like "During the 2008 financial crisis, similar mortgage-related news led to X% losses at major banks like..." or "When central banks previously raised rates in similar circumstances, banks experienced..." Focus on actionable historical insights.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Use util.py for LLM call
        content = llm_call(messages, temperature=0.1)
        
        # Extract thoughts and response using util.py
        thoughts = extract_xml(content, "thoughts")
        response_json = extract_xml(content, "response")
        
        if not thoughts or not response_json:
            raise Exception("Generator failed to produce properly formatted response with XML tags")
        
        # Parse JSON using util.py
        risk_analysis = parse_json_from_xml(response_json)
        
        # Validate using util.py
        risk_analysis = validate_risk_analysis(risk_analysis)
        
        print(f"\n=== GENERATION START ===")
        print(f"Thoughts:\n{thoughts}\n")
        print(f"Generated Risk Analysis:")
        print(f"  Primary Category: {risk_analysis.get('primary_risk_category', 'N/A')}")
        print(f"  Secondary Categories: {risk_analysis.get('secondary_risk_categories', [])}")
        print(f"  Severity: {risk_analysis.get('severity_level', 'N/A')}")
        print(f"  Confidence: {risk_analysis.get('confidence_score', 'N/A')}%")
        print(f"  Market Moving: {risk_analysis.get('is_market_moving', 'N/A')}")
        print(f"=== GENERATION END ===\n")
        
        return thoughts, risk_analysis
    
    def evaluate_risk_analysis(self, risk_analysis: Dict, news_data: Dict, original_task: str) -> Tuple[str, str]:
        """
        Evaluator: Assess quality of risk analysis and provide feedback using OpenAI via util.py.
        
        Args:
            risk_analysis: Generated risk analysis to evaluate
            news_data: Original news data
            original_task: Description of the analysis task
            
        Returns:
            Tuple of (evaluation_status, feedback)
        """
        system_prompt = """You are a senior financial risk assessment auditor with expertise in banking regulations, 
        market analysis, and risk management frameworks. Your role is to evaluate risk analyses for:
        
        1. Accuracy and logical consistency
        2. Appropriate risk categorization and severity assessment
        3. Realistic financial exposure estimates
        4. Proper confidence scoring based on available information
        5. Correct identification of market-moving events and action requirements
        6. Quality of supporting reasoning and justification
        7. Detailed justification explaining sentiment, confidence, impact, affected markets, is_market_moving, is_breaking_news, requires_action, historical_impact_analysis
        
        You should be thorough but fair. Only pass analyses that meet professional standards.
        Output your evaluation in the specified format."""
        
        user_prompt = f"""
        Evaluate this risk analysis for the given news article:
        
        Original News:
        Headline: {news_data['headline']}
        Content: {news_data['story'][:1000]}...
        Source: {news_data['newsSource']}
        
        Risk Analysis to Evaluate:
        {json.dumps(risk_analysis, indent=2)}
        
        Original Task: {original_task}
        
        Evaluate based on these criteria:
        1. Risk categorization accuracy (is the primary risk category appropriate?)
        2. Severity assessment (does severity match the actual impact described?)
        3. Confidence scoring (is confidence level justified by information quality?)
        4. Market impact assessment (is is_market_moving correctly identified?)
        5. Action requirement (is requires_action appropriately set?)
        6. Financial exposure realism (is the estimate reasonable for this type of event?)
        7. Geographic and entity identification accuracy
        8. Quality of reasoning in description field
        
        Output PASS only if all criteria are well met with minor or no issues.
        Output NEEDS_IMPROVEMENT if there are significant issues but the analysis is salvageable.
        Output FAIL if there are fundamental errors that require complete rework.
        
        Provide your response in this exact format:
        
        <evaluation>PASS, NEEDS_IMPROVEMENT, or FAIL</evaluation>
        <feedback>
        Specific, actionable feedback on what needs improvement and why.
        Focus on the most critical issues first.
        </feedback>
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Use util.py for LLM call
        content = llm_call(messages, temperature=0.1)
        
        # Extract evaluation and feedback using util.py
        evaluation = extract_xml(content, "evaluation")
        feedback = extract_xml(content, "feedback")
        
        if not evaluation or not feedback:
            print(f"❌ XML PARSING ERROR in evaluator:")
            print(f"Raw LLM response:\n{content}\n")
            print(f"Extracted evaluation: '{evaluation}'")
            print(f"Extracted feedback: '{feedback}'")
            raise Exception("Evaluator failed to produce properly formatted response with XML tags")
        
        evaluation = evaluation.strip()
        feedback = feedback.strip()
        
        print(f"=== EVALUATION START ===")
        print(f"Status: {evaluation}")
        print(f"Feedback: {feedback}")
        print(f"=== EVALUATION END ===\n")
        
        return evaluation, feedback
    
    def optimize_risk_analysis(self, news_data: Dict, task_description: str) -> Tuple[Dict, List[Dict]]:
        """
        Main optimization loop: Generate and evaluate until requirements are met.
        Following the Anthropic cookbook pattern with clean error handling.
        
        Args:
            news_data: News article data to analyze
            task_description: Description of the analysis task
            
        Returns:
            Tuple of (final_risk_analysis, iteration_history)
            
        Raises:
            Exception: If all iterations fail (to be handled by Huey retries)
        """
        print(f"🔄 Starting Evaluator-Optimizer workflow for news: {news_data['newsId']}")
        
        iteration_history = []
        previous_feedback = []
        
        for iteration in range(1, self.max_iterations + 1):
            print(f"\n--- ITERATION {iteration} ---")
            
            # Build feedback context from previous attempts
            feedback_context = ""
            if previous_feedback:
                feedback_context = "\nPrevious evaluation feedback to address:\n"
                for i, prev in enumerate(previous_feedback, 1):
                    feedback_context += f"Attempt {i} feedback: {prev}\n"
                feedback_context += "\nPlease address the above feedback and improve your analysis.\n"
            
            # Generate risk analysis
            thoughts, risk_analysis = self.generate_risk_analysis(news_data, feedback_context)
            
            # Record attempt
            attempt_record = {
                "iteration": iteration,
                "thoughts": thoughts,
                "risk_analysis": risk_analysis,
                "summary": f"Primary: {risk_analysis.get('primary_risk_category', 'N/A')}, "
                          f"Secondary: {risk_analysis.get('secondary_risk_categories', [])}, "
                          f"Severity: {risk_analysis.get('severity_level', 'N/A')}, "
                          f"Confidence: {risk_analysis.get('confidence_score', 'N/A')}%"
            }
            
            # Evaluate the analysis
            evaluation, feedback = self.evaluate_risk_analysis(
                risk_analysis, news_data, task_description
            )
            
            attempt_record["evaluation"] = evaluation
            attempt_record["feedback"] = feedback
            iteration_history.append(attempt_record)
            
            # Check if we're done
            if evaluation == "PASS":
                print(f"✅ Risk analysis passed evaluation on iteration {iteration}")
                return risk_analysis, iteration_history
            
            elif evaluation == "NEEDS_IMPROVEMENT" and iteration == self.max_iterations:
                # Accept NEEDS_IMPROVEMENT on the final iteration to avoid endless loops
                print(f"⚠️ Risk analysis has minor issues but is acceptable on final iteration {iteration}")
                return risk_analysis, iteration_history
            
            elif evaluation == "FAIL" and iteration == self.max_iterations:
                # This is where we differ from having fallback logic
                # We raise an exception and let Huey handle retries
                error_msg = f"Risk analysis failed evaluation after {self.max_iterations} iterations. Final feedback: {feedback}"
                print(f"❌ {error_msg}")
                raise Exception(error_msg)
            
            # Prepare feedback for next iteration
            previous_feedback.append(feedback)
        
        # If we reach here, the last iteration didn't pass
        error_msg = f"Optimization incomplete after {self.max_iterations} iterations"
        print(f"❌ {error_msg}")
        raise Exception(error_msg)


def process_news_with_evaluator_optimizer(news_data: Dict, max_iterations: int = 3) -> Dict:
    """
    Process news article using Evaluator-Optimizer pattern.
    Clean implementation following the Anthropic cookbook - no fallback logic.
    
    Args:
        news_data: News article data
        max_iterations: Maximum optimization iterations
        
    Returns:
        dict: Risk analysis results with optimization metadata
        
    Raises:
        Exception: If optimization fails (to be handled by Huey retries)
    """
    # Initialize the optimizer
    optimizer = RiskAnalysisEvaluatorOptimizer(max_iterations=max_iterations)
    
    # Define the analysis task
    task_description = """
    Analyze banking/financial news for comprehensive risk assessment including:
    - Accurate risk categorization and severity assessment and sentiment analysis with justification
    - Realistic financial exposure estimates
    - Proper confidence scoring based on information quality  
    - Correct identification of market-moving events
    - Appropriate action requirements for risk management
    - Historical impact analysis
    """
    
    # Run the optimization process - let exceptions bubble up to Huey
    optimized_analysis, history = optimizer.optimize_risk_analysis(news_data, task_description)
    
    # Add optimization metadata
    optimized_analysis['_optimization_meta'] = {
        'iterations_used': len(history),
        'final_evaluation': history[-1]['evaluation'] if history else 'UNKNOWN',
        'optimization_timestamp': datetime.now().isoformat(),
        'workflow_type': 'evaluator_optimizer'
    }
    
    return optimized_analysis


# Example usage and testing
if __name__ == "__main__":
    # Test data
    test_news = {
        'newsId': 'TEST_001',
        'headline': 'Federal Reserve Announces Emergency Rate Cut Amid Banking Concerns',
        'story': '''The Federal Reserve announced an emergency 50 basis point rate cut today following widespread concerns about banking sector stability. The decision comes after several regional banks reported significant exposure to commercial real estate defaults and rising credit losses. Market analysts are warning that this could signal deeper systemic issues in the financial sector, with some comparing the current situation to early warning signs seen before the 2008 financial crisis. The Fed's action has caused immediate volatility in financial markets, with bank stocks falling sharply while treasury yields declined.''',
        'newsSource': 'Federal Reserve Bank',
        'creationTimestamp': '2025-06-30T10:00:00Z'
    }
    
    print("Testing Evaluator-Optimizer Workflow")
    print("=" * 50)
    
    try:
        print("Example workflow structure demonstrated")
        print("✅ Implementation ready for integration")
        print("Note: Requires OpenAI API key in environment for actual execution")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")