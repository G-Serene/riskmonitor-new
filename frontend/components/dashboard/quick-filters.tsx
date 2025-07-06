"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
// Select components removed - no longer needed since time range is controlled by main dashboard
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Settings, Filter, X, Zap } from "lucide-react"
import { 
  RiskFilters, 
  DEFAULT_FILTERS, 
  SEVERITY_OPTIONS, 
  INDUSTRY_SECTORS,
  SMART_PRESETS,
  FilterPreset,
  getFilterSummary,
  hasAdvancedFiltersActive
} from "@/lib/filters"
import { apiClient } from "@/lib/api-client"

interface QuickFiltersProps {
  filters: RiskFilters
  onFiltersChange: (filters: RiskFilters) => void
  onOpenAdvanced: () => void
  articleCount?: number
}

export function QuickFilters({ 
  filters, 
  onFiltersChange, 
  onOpenAdvanced,
  articleCount 
}: QuickFiltersProps) {
  const [showPresets, setShowPresets] = useState(false)
  const [availableThemes, setAvailableThemes] = useState<{ id: string, name: string }[]>([])

  useEffect(() => {
    async function fetchThemes() {
      try {
        const res = await apiClient.getThemeStatistics()
        setAvailableThemes((res.themes || []).map((t: any) => ({ id: t.theme_id, name: t.theme_name })))
      } catch (e) {
        setAvailableThemes([])
      }
    }
    fetchThemes()
  }, [])

  const updateFilters = (updates: Partial<RiskFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const applyPreset = (preset: FilterPreset) => {
    onFiltersChange({ ...DEFAULT_FILTERS, ...preset.filters })
    setShowPresets(false)
  }

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS)
  }

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)
  const filterSummary = getFilterSummary(filters)
  const hasAdvancedFilters = hasAdvancedFiltersActive(filters)

  return (
    <div className="flex flex-col gap-2">
      {/* Single Compact Filter Row */}
      <div className="flex flex-wrap items-center gap-3 py-2">
        {/* Risk Score Range - Made more compact */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <Label className="text-sm font-medium text-nowrap">Risk:</Label>
          <div className="flex-1 min-w-[100px] px-1">
            <Slider
              value={filters.riskScoreRange}
              onValueChange={(value) => updateFilters({ riskScoreRange: value as [number, number] })}
              max={10}
              min={0}
              step={0.1}
              className="w-full h-2"
            />
          </div>
          <Badge variant="outline" className="text-xs px-1 min-w-[50px] text-center">
            {filters.riskScoreRange[0].toFixed(1)}-{filters.riskScoreRange[1].toFixed(1)}
          </Badge>
        </div>

        {/* Severity Dropdown - Compact */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              {filters.severityLevels.length > 0 
                ? `Severity (${filters.severityLevels.length})`
                : "Severity"
              }
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Severity Levels</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SEVERITY_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.severityLevels.includes(option.value)}
                onCheckedChange={(checked) => {
                  const newLevels = checked
                    ? [...filters.severityLevels, option.value]
                    : filters.severityLevels.filter(level => level !== option.value)
                  updateFilters({ severityLevels: newLevels })
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${option.color}`} />
                  {option.label}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Dropdown - replaces Breaking News toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1 ${filters.themes.length > 0 ? 'bg-blue-50 border-blue-200' : ''}`}>
              🎯 Theme {filters.themes.length > 0 && `(${filters.themes.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Themes</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableThemes.map((theme) => (
              <DropdownMenuCheckboxItem
                key={theme.id}
                checked={filters.themes.includes(theme.name)}
                onCheckedChange={(checked) => {
                  const newThemes = checked 
                    ? [...filters.themes, theme.name]
                    : filters.themes.filter(t => t !== theme.name)
                  updateFilters({ themes: newThemes })
                }}
                className="text-xs"
              >
                {theme.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Industry Sectors Dropdown - Compact */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={`h-8 text-xs gap-1 ${filters.industrySectors.length > 0 ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              🏭 Industry {filters.industrySectors.length > 0 && `(${filters.industrySectors.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Industry Sectors</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {INDUSTRY_SECTORS.map((sector) => (
              <DropdownMenuCheckboxItem
                key={sector.value}
                checked={filters.industrySectors.includes(sector.value)}
                onCheckedChange={(checked) => {
                  const newSectors = checked 
                    ? [...filters.industrySectors, sector.value]
                    : filters.industrySectors.filter(s => s !== sector.value)
                  updateFilters({ industrySectors: newSectors })
                }}
                className="text-xs"
              >
                {sector.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Smart Presets - Compact */}
        <DropdownMenu open={showPresets} onOpenChange={setShowPresets}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Zap className="h-3 w-3" />
              Presets
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Smart Filter Presets</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SMART_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="flex items-start gap-3 p-3 hover:bg-muted cursor-pointer rounded-sm"
                onClick={() => applyPreset(preset)}
              >
                <div className="text-lg">{preset.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">{preset.description}</div>
                </div>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Advanced Filters - Compact */}
        <Button 
          variant={hasAdvancedFilters ? "default" : "outline"} 
          size="sm" 
          onClick={onOpenAdvanced} 
          className={`h-8 text-xs gap-1 ${hasAdvancedFilters ? 'bg-gray-800 hover:bg-gray-700 text-white' : ''}`}
        >
          <Settings className="h-3 w-3" />
          Advanced
          {hasAdvancedFilters && (
            <div className="ml-1 h-1.5 w-1.5 bg-current rounded-full opacity-70" />
          )}
        </Button>

        {/* Clear Filters - Compact */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 text-xs gap-1">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}

        {/* Results Count */}
        {articleCount !== undefined && (
          <Badge variant="secondary" className="ml-auto bg-blue-50 text-blue-700 text-xs">
            {articleCount} articles
          </Badge>
        )}
      </div>

      {/* Active Filter Tags Row - Only show if filters are active */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 pb-1">
          {filters.riskScoreRange[0] > 0 || filters.riskScoreRange[1] < 10 ? (
            <Badge variant="secondary" className="gap-1 text-xs h-6">
              Risk: {filters.riskScoreRange[0].toFixed(1)}-{filters.riskScoreRange[1].toFixed(1)}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ riskScoreRange: [0, 10] })}
              />
            </Badge>
          ) : null}
          
          {filters.severityLevels.map((level) => (
            <Badge key={level} variant="secondary" className="gap-1 text-xs h-6">
              {level}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ 
                  severityLevels: filters.severityLevels.filter(l => l !== level) 
                })}
              />
            </Badge>
          ))}
          
          {/* Time range badge removed - now shown in main dashboard */}
          
          {filters.themes.map((theme) => (
            <Badge key={theme} variant="secondary" className="gap-1 text-xs h-6">
              {theme}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ 
                  themes: filters.themes.filter(t => t !== theme) 
                })}
              />
            </Badge>
          ))}
          
          {filters.industrySectors.map((sector) => (
            <Badge key={sector} variant="secondary" className="gap-1 text-xs h-6">
              {INDUSTRY_SECTORS.find(s => s.value === sector)?.label || sector}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ 
                  industrySectors: filters.industrySectors.filter(s => s !== sector) 
                })}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
