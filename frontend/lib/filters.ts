// Filter types and interfaces for the risk dashboard

export interface RiskFilters {
  // Quick filters (header)
  riskScoreRange: [number, number] // [min, max] 0-10
  severityLevels: string[] // ['Critical', 'High', 'Medium', 'Low']
  timeRange: string // '1h', '6h', '24h', '3d', '1w', 'all'
  breakingNewsOnly: boolean
  industrySectors: string[] // Industry sector filtering
  
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
  timeRange: 'all', // Don't filter by time on frontend since backend already does it
  breakingNewsOnly: false,
  industrySectors: [],
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
      severityLevels: ['Critical', 'High'],
      timeRange: '6h'
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
      riskScoreRange: [6.0, 10],
      timeRange: '3h'
    }
  },
  {
    id: 'regional-focus',
    name: 'Regional Focus',
    description: 'Geographic risk concentration analysis',
    icon: '🌍',
    filters: {
      riskScoreRange: [5.0, 10],
      timeRange: '24h',
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
      riskScoreRange: [7.0, 10],
      timeRange: '12h'
    }
  },
  {
    id: 'regulatory-watch',
    name: 'Regulatory Watch',
    description: 'Regulatory changes and compliance issues',
    icon: '📋',
    filters: {
      regulatoryOnly: true,
      riskScoreRange: [4.0, 10],
      timeRange: '1w'
    }
  }
]

export const SEVERITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'High', label: 'High', color: 'bg-orange-500' },
  { value: 'Medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'Low', label: 'Low', color: 'bg-green-500' }
]

export const TIME_RANGE_OPTIONS = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '3d', label: 'Last 3 Days' },
  { value: '1w', label: 'Last Week' },
  { value: 'all', label: 'All Time' }
]

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
    
    // Time range
    if (filters.timeRange !== 'all') {
      const now = new Date()
      const articleDate = new Date(article.published_date)
      const hoursDiff = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60)
      
      const timeRanges = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '3d': 72,
        '1w': 168
      }
      
      if (hoursDiff > timeRanges[filters.timeRange as keyof typeof timeRanges]) {
        return false
      }
    }
    
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
  
  if (filters.timeRange !== 'all') {
    const timeLabel = TIME_RANGE_OPTIONS.find(opt => opt.value === filters.timeRange)?.label
    activeFilters.push(`Time: ${timeLabel}`)
  }
  
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
