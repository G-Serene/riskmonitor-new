// Filter types and interfaces for the risk dashboard

export interface RiskFilters {
  // Quick filters (header)
  riskScoreRange: [number, number] // [min, max] 0-10
  severityLevels: string[] // ['Critical', 'High', 'Medium', 'Low']
  // timeRange removed - now uses main dashboard time window
  breakingNewsOnly: boolean
  industrySectors: string[] // Industry sector filtering
  
  // Theme filter
  themes: string[] // Theme filtering
  
  // Advanced filters
  countries: string[]
  riskCategories: string[]
  confidenceRange: [number, number] // [min, max] 0-100
  sentimentRange: [number, number] // [min, max] -1 to 1
  
  // Toggles
  trendingOnly: boolean
  marketMovingOnly: boolean
  requiresActionOnly: boolean
  regulatoryOnly: boolean
  
  // Search
  searchKeywords: string
  sourceFilter: string[]
}

export interface FilterPreset {
  id: string
  name: string
  description: string
  icon: string
  filters: Partial<RiskFilters>
}

export const DEFAULT_FILTERS: RiskFilters = {
  riskScoreRange: [0, 10],
  severityLevels: [],
  // timeRange removed - now controlled by main dashboard time window
  breakingNewsOnly: false,
  industrySectors: [],
  themes: [],
  countries: [],
  riskCategories: [],
  confidenceRange: [0, 100],
  sentimentRange: [-1, 1],
  trendingOnly: false,
  marketMovingOnly: false,
  requiresActionOnly: false,
  regulatoryOnly: false,
  searchKeywords: '',
  sourceFilter: []
}

export const SMART_PRESETS: FilterPreset[] = [
  {
    id: 'critical-alerts',
    name: 'Critical Alerts',
    description: 'High-risk situations requiring immediate attention',
    icon: '🚨',
    filters: {
      riskScoreRange: [8.0, 10],
      severityLevels: ['Critical', 'High']
      // timeRange removed - uses main dashboard time window
    }
  },
  {
    id: 'market-disruption',
    name: 'Market Disruption',
    description: 'Breaking news with market-moving potential',
    icon: '📊',
    filters: {
      breakingNewsOnly: true,
      marketMovingOnly: true,
      riskScoreRange: [6.0, 10]
      // timeRange removed - uses main dashboard time window
    }
  },
  {
    id: 'regional-focus',
    name: 'Regional Focus',
    description: 'Geographic risk concentration analysis',
    icon: '🌍',
    filters: {
      riskScoreRange: [5.0, 10]
      // timeRange removed - uses main dashboard time window
      // Will be populated with user's region preferences
    }
  },
  {
    id: 'action-required',
    name: 'Action Required',
    description: 'Items flagged for immediate action',
    icon: '⚠️',
    filters: {
      requiresActionOnly: true,
      riskScoreRange: [7.0, 10]
      // timeRange removed - uses main dashboard time window
    }
  },
  {
    id: 'regulatory-watch',
    name: 'Regulatory Watch',
    description: 'Regulatory changes and compliance issues',
    icon: '📋',
    filters: {
      regulatoryOnly: true,
      riskScoreRange: [4.0, 10]
      // timeRange removed - uses main dashboard time window
    }
  }
]

export const SEVERITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'High', label: 'High', color: 'bg-orange-500' },
  { value: 'Medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'Low', label: 'Low', color: 'bg-green-500' }
]

// TIME_RANGE_OPTIONS removed - news feed now uses main dashboard time window
// All time filtering is handled by the backend API based on the main time window selection

export const INDUSTRY_SECTORS = [
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'energy', label: 'Energy' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'government', label: 'Government' },
  { value: 'education', label: 'Education' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'mining', label: 'Mining' },
  { value: 'construction', label: 'Construction' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'media', label: 'Media' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'aerospace', label: 'Aerospace' }
] as const

// Helper function to apply filters to news articles
export function applyFilters(articles: any[], filters: RiskFilters): any[] {
  return articles.filter(article => {
    // Risk score range
    if (article.overall_risk_score < filters.riskScoreRange[0] || 
        article.overall_risk_score > filters.riskScoreRange[1]) {
      return false
    }
    
    // Severity levels
    if (filters.severityLevels.length > 0 && 
        !filters.severityLevels.includes(article.severity_level)) {
      return false
    }
    
    // Time range filtering removed - now handled by main dashboard time window
    // The backend API already filters by time window, so frontend doesn't need to
    
    // Breaking news only
    if (filters.breakingNewsOnly && !article.is_breaking_news) {
      return false
    }
    
    // Countries
    if (filters.countries.length > 0) {
      const hasMatchingCountry = filters.countries.some(country => 
        article.countries.includes(country)
      )
      if (!hasMatchingCountry) return false
    }
    
    // Industry sectors
    if (filters.industrySectors.length > 0) {
      let articleSectors: string[] = []
      try {
        if (typeof article.industry_sectors === 'string') {
          articleSectors = JSON.parse(article.industry_sectors)
        } else if (Array.isArray(article.industry_sectors)) {
          articleSectors = article.industry_sectors
        }
      } catch (e) {
        // If parsing fails, skip this filter
        return false
      }
      
      const hasMatchingIndustry = filters.industrySectors.some(sector => 
        articleSectors.includes(sector)
      )
      if (!hasMatchingIndustry) return false
    }
    
    // Theme filter
    if (filters.themes.length > 0) {
      const themeMatch = filters.themes.some(theme =>
        article.primary_theme === theme || article.theme_display_name === theme
      )
      if (!themeMatch) return false
    }
    
    // Risk categories
    if (filters.riskCategories.length > 0 && 
        !filters.riskCategories.includes(article.primary_risk_category)) {
      return false
    }
    
    // Confidence range
    if (article.confidence_score < filters.confidenceRange[0] || 
        article.confidence_score > filters.confidenceRange[1]) {
      return false
    }
    
    // Sentiment range
    if (article.sentiment_score < filters.sentimentRange[0] || 
        article.sentiment_score > filters.sentimentRange[1]) {
      return false
    }
    
    // Financial exposure filtering removed as requested
    
    // Toggle filters
    if (filters.trendingOnly && !article.is_trending) return false
    if (filters.marketMovingOnly && !article.is_market_moving) return false
    if (filters.requiresActionOnly && !article.requires_action) return false
    if (filters.regulatoryOnly && !article.is_regulatory) return false
    
    // Search keywords
    if (filters.searchKeywords) {
      const searchText = filters.searchKeywords.toLowerCase()
      const searchInFields = [
        article.headline,
        article.summary,
        article.keywords?.join(' ') || '',
        article.entities?.join(' ') || ''
      ].join(' ').toLowerCase()
      
      if (!searchInFields.includes(searchText)) return false
    }
    
    // Source filter
    if (filters.sourceFilter.length > 0 && 
        !filters.sourceFilter.includes(article.source_name)) {
      return false
    }
    
    return true
  })
}

// Get filter summary text
export function getFilterSummary(filters: RiskFilters): string {
  const activeFilters: string[] = []
  
  if (filters.riskScoreRange[0] > 0 || filters.riskScoreRange[1] < 10) {
    activeFilters.push(`Risk: ${filters.riskScoreRange[0]}-${filters.riskScoreRange[1]}`)
  }
  
  if (filters.severityLevels.length > 0) {
    activeFilters.push(`Severity: ${filters.severityLevels.join(', ')}`)
  }
  
  // Time range removed - now shown in main dashboard time window
  
  if (filters.breakingNewsOnly) activeFilters.push('Breaking News')
  if (filters.industrySectors.length > 0) {
    activeFilters.push(`Industries: ${filters.industrySectors.length}`)
  }
  if (filters.trendingOnly) activeFilters.push('Trending')
  if (filters.marketMovingOnly) activeFilters.push('Market Moving')
  if (filters.requiresActionOnly) activeFilters.push('Action Required')
  
  return activeFilters.length > 0 ? activeFilters.join(' • ') : 'No filters applied'
}

// Check if advanced filters are active (non-default values)
export function hasAdvancedFiltersActive(filters: RiskFilters): boolean {
  // Advanced filters are those configured in the advanced filter sheet
  // Check countries
  if (filters.countries.length > 0) return true
  
  // Check risk categories
  if (filters.riskCategories.length > 0) return true
  
  // Check confidence range (default is [0, 100])
  if (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100) return true
  
  // Check sentiment range (default is [-1, 1])
  if (filters.sentimentRange[0] > -1 || filters.sentimentRange[1] < 1) return true
  
  // Check regulatory filter
  if (filters.regulatoryOnly) return true
  
  // Check search keywords
  if (filters.searchKeywords.trim().length > 0) return true
  
  // Check source filter
  if (filters.sourceFilter.length > 0) return true
  
  return false
}
