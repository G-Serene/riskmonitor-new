"""
Utility functions for LLM calls and XML extraction following the Anthropic cookbook pattern
but supporting both OpenAI and Azure OpenAI as backends.
"""

import openai
import os
import re
import json
import logging
from typing import Dict, Any, Optional
import xml.etree.ElementTree as ET
from xml.dom import minidom
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv(override=True)  # Force reload environment variables

# Configure logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'llm_calls.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def safe_json_loads(field_value, default=None):
    """Safely parse JSON with error handling"""
    if not field_value:
        return default if default is not None else []
    try:
        return json.loads(field_value)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Problematic value: {repr(field_value)}")
        return default if default is not None else []


# Initialize LLM client based on provider configuration
def _initialize_llm_client():
    """Initialize the appropriate OpenAI client based on configuration"""
    provider = os.getenv('LLM_PROVIDER', 'openai').lower()
    
    if provider == 'azure':
        # Azure OpenAI configuration
        api_key = os.getenv('AZURE_OPENAI_API_KEY')
        endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview')
        
        if not api_key or not endpoint:
            raise ValueError(
                "Azure OpenAI configuration incomplete. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT"
            )
        
        print(f"🔧 Initializing Azure OpenAI client - Endpoint: {endpoint}")
        return openai.AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=api_version
        )
    else:
        # Standard OpenAI configuration
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OpenAI API key not found. Please set OPENAI_API_KEY environment variable")
        
        print(f"🔧 Initializing OpenAI client")
        return openai.OpenAI(api_key=api_key)

# Initialize the client
client = _initialize_llm_client()

def get_model_name() -> str:
    """Get the model name based on provider configuration"""
    provider = os.getenv('LLM_PROVIDER', 'openai').lower()
    
    if provider == 'azure':
        # For Azure, use the deployment name
        deployment_name = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4.1')
        return deployment_name
    else:
        # For OpenAI, use the model name directly
        model_name = os.getenv('LLM_MODEL', 'gpt-4.1')
        return model_name


def llm_call(messages: list, model: str = None, temperature: float = 0.1) -> str:
    """
    Make a call to OpenAI's API (or Azure OpenAI) with consistent error handling.
    
    Args:
        messages: List of message dictionaries with 'role' and 'content'
        model: Model/deployment name to use (if None, uses configured default)
        temperature: Sampling temperature
        
    Returns:
        str: The response content from the LLM
        
    Raises:
        Exception: If the API call fails (to be handled by Huey retries)
    """
    try:
        # Use configured model if none specified
        if model is None:
            model = get_model_name()
        
        provider = os.getenv('LLM_PROVIDER', 'openai').lower()
        
        # Log the request
        logger.info(f"🤖 LLM REQUEST START")
        logger.info(f"Provider: {provider}")
        logger.info(f"Model: {model}")
        logger.info(f"Temperature: {temperature}")
        logger.info(f"Messages count: {len(messages)}")
        
        # Log each message with content preview
        for i, message in enumerate(messages):
            role = message.get('role', 'unknown')
            content = message.get('content', '')
            content_preview = content[:200] + "..." if len(content) > 200 else content
            logger.info(f"Message {i+1} ({role}): {content_preview}")
        
        logger.info("📤 Sending request to LLM...")
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature
        )
        
        response_content = response.choices[0].message.content
        
        # Log the response
        logger.info(f"📥 LLM RESPONSE RECEIVED")
        logger.info(f"Response length: {len(response_content)} characters")
        logger.info(f"Response preview: {response_content[:300]}...")
        
        # Log full response for debugging (can be disabled in production)
        debug_mode = os.getenv('DEBUG_MODE', 'false').lower() == 'true'
        if debug_mode:
            logger.info(f"🔍 FULL LLM RESPONSE:\n{response_content}")
        
        # Log token usage if available
        if hasattr(response, 'usage') and response.usage:
            logger.info(f"💰 Token usage - Prompt: {response.usage.prompt_tokens}, Completion: {response.usage.completion_tokens}, Total: {response.usage.total_tokens}")
        
        logger.info(f"✅ LLM REQUEST COMPLETED")
        
        return response_content
        
    except Exception as e:
        provider = os.getenv('LLM_PROVIDER', 'openai').lower()
        provider_name = "Azure OpenAI" if provider == 'azure' else "OpenAI"
        error_msg = f"{provider_name} API call failed: {str(e)}"
        
        # Log the error
        logger.error(f"❌ LLM REQUEST FAILED: {error_msg}")
        
        # Let Huey handle retries - just re-raise the exception
        raise Exception(error_msg)


def extract_xml(text: str, tag: str) -> Optional[str]:
    """
    Extract content from XML tags in the response text.
    
    Args:
        text: The text containing XML tags
        tag: The XML tag name to extract (without < >)
        
    Returns:
        str: The content within the XML tags, or None if not found
        
    Raises:
        Exception: If XML parsing fails
    """
    try:
        # Try to find the XML content using regex first (more robust)
        pattern = f"<{tag}>(.*?)</{tag}>"
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        
        if match:
            content = match.group(1).strip()
            return content
        
        # If regex fails, try XML parsing
        try:
            # Wrap in root element if not already wrapped
            if not text.strip().startswith('<'):
                wrapped_text = f"<root>{text}</root>"
            else:
                wrapped_text = text
                
            root = ET.fromstring(wrapped_text)
            element = root.find(f".//{tag}")
            if element is not None:
                return element.text.strip() if element.text else ""
                
        except ET.ParseError:
            pass
            
        # Return None if tag not found
        return None
        
    except Exception as e:
        raise Exception(f"XML extraction failed for tag '{tag}': {str(e)}")


def parse_json_from_xml(xml_content: str) -> Dict[str, Any]:
    """
    Parse JSON content from XML extracted text.
    
    Args:
        xml_content: The content extracted from XML tags
        
    Returns:
        dict: Parsed JSON as dictionary
        
    Raises:
        Exception: If JSON parsing fails
    """
    try:
        # Clean up the content - remove any extra whitespace or formatting
        cleaned_content = xml_content.strip()
        
        # Try to parse as JSON
        return json.loads(cleaned_content)
        
    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse JSON from XML content: {str(e)}\nContent: {xml_content[:200]}...")
    except Exception as e:
        raise Exception(f"Unexpected error parsing JSON: {str(e)}")


def format_xml_response(content: str, tag: str) -> str:
    """
    Format content within XML tags for consistent responses.
    
    Args:
        content: The content to wrap
        tag: The XML tag name
        
    Returns:
        str: Content wrapped in XML tags
    """
    return f"<{tag}>\n{content}\n</{tag}>"


def validate_risk_analysis(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and clean up risk analysis results.
    
    Args:
        analysis: Risk analysis dictionary
        
    Returns:
        dict: Validated and cleaned analysis
        
    Raises:
        Exception: If validation fails
    """
    required_fields = [
        'primary_risk_category', 'severity_level', 'confidence_score', 
        'impact_score', 'summary', 'description'
    ]
    
    try:
        # Check required fields
        for field in required_fields:
            if field not in analysis:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate severity level
        valid_severities = ['Critical', 'High', 'Medium', 'Low']
        if analysis['severity_level'] not in valid_severities:
            raise ValueError(f"Invalid severity level: {analysis['severity_level']}")
        
        # Validate urgency level
        valid_urgency_levels = ['Critical', 'High', 'Medium', 'Low']
        if 'urgency_level' in analysis and analysis['urgency_level'] not in valid_urgency_levels:
            print(f"⚠️ Warning: Invalid urgency level '{analysis['urgency_level']}', defaulting to 'Medium'")
            analysis['urgency_level'] = 'Medium'
        
        # Validate temporal impact
        valid_temporal_impacts = ['Immediate', 'Short-term', 'Medium-term', 'Long-term']
        if 'temporal_impact' in analysis and analysis['temporal_impact'] not in valid_temporal_impacts:
            print(f"⚠️ Warning: Invalid temporal impact '{analysis['temporal_impact']}', defaulting to 'Medium-term'")
            analysis['temporal_impact'] = 'Medium-term'
        
        # Validate primary risk category
        valid_categories = [
            'market_risk', 'credit_risk', 'operational_risk', 'liquidity_risk',
            'cybersecurity_risk', 'regulatory_risk', 'systemic_risk', 'reputational_risk'
        ]
        primary_category = analysis['primary_risk_category']
        
        # If multiple categories are provided (separated by |), take the first one and move others to secondary
        if '|' in primary_category:
            categories = [cat.strip() for cat in primary_category.split('|')]
            primary_category = categories[0]
            print(f"Multiple risk categories detected in primary field: {analysis['primary_risk_category']}. Using primary: {primary_category}")
            analysis['primary_risk_category'] = primary_category
            
            # Add the additional categories to secondary categories
            if 'secondary_risk_categories' not in analysis:
                analysis['secondary_risk_categories'] = []
            analysis['secondary_risk_categories'].extend([cat for cat in categories[1:] if cat not in analysis['secondary_risk_categories']])
        
        # Validate the primary category
        if analysis['primary_risk_category'] not in valid_categories:
            raise ValueError(f"Invalid primary risk category: {analysis['primary_risk_category']}")
        
        # Validate secondary risk categories if present
        if 'secondary_risk_categories' in analysis:
            for secondary_cat in analysis['secondary_risk_categories']:
                if secondary_cat not in valid_categories:
                    print(f"Warning: Invalid secondary risk category: {secondary_cat}")
                    # Remove invalid categories
                    analysis['secondary_risk_categories'] = [cat for cat in analysis['secondary_risk_categories'] if cat in valid_categories]
        
        # Ensure numeric fields are within valid ranges
        if not (0 <= analysis.get('confidence_score', 0) <= 100):
            analysis['confidence_score'] = max(0, min(100, analysis.get('confidence_score', 50)))
        
        if not (0 <= analysis.get('impact_score', 0) <= 100):
            analysis['impact_score'] = max(0, min(100, analysis.get('impact_score', 50)))
        
        # Convert integer score fields to ensure consistency with database schema
        analysis['confidence_score'] = int(analysis.get('confidence_score', 50))
        analysis['impact_score'] = int(analysis.get('impact_score', 50))
        
        # Convert theme_confidence to integer if present (set by theme classification system)
        if 'theme_confidence' in analysis:
            analysis['theme_confidence'] = int(analysis.get('theme_confidence', 30))
        
        # Ensure sentiment score is between -1 and 1
        sentiment = analysis.get('sentiment_score', 0.0)
        if not (-1.0 <= sentiment <= 1.0):
            analysis['sentiment_score'] = max(-1.0, min(1.0, sentiment))
        
        # Set defaults for optional fields
        defaults = {
            'secondary_risk_categories': [],
            'risk_subcategories': [],
            'urgency_level': 'Medium',
            'temporal_impact': 'Medium-term',
            'geographic_regions': [],
            'industry_sectors': ['financial_services'],
            'countries': [],
            'affected_markets': [],
            'keywords': [],
            'entities': [],
            'is_market_moving': False,
            'is_breaking_news': False,
            'is_regulatory': False,
            'requires_action': False,
            'financial_exposure': 0,
            'risk_contribution': 0.0
        }
        
        for key, default_value in defaults.items():
            if key not in analysis:
                analysis[key] = default_value
        
        # Backward compatibility: if risk_category exists instead of primary_risk_category
        if 'risk_category' in analysis and 'primary_risk_category' not in analysis:
            analysis['primary_risk_category'] = analysis['risk_category']
            print("Converted legacy 'risk_category' field to 'primary_risk_category'")
        
        return analysis
        
    except Exception as e:
        raise Exception(f"Risk analysis validation failed: {str(e)}")
