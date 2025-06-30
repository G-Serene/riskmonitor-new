"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Globe, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  X,
  RotateCcw
} from "lucide-react"
import { RiskFilters, DEFAULT_FILTERS, INDUSTRY_SECTORS } from "@/lib/filters"

interface AdvancedFiltersProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  filters: RiskFilters
  onFiltersChange: (filters: RiskFilters) => void
  availableCountries?: string[]
  availableRiskCategories?: string[]
  availableSources?: string[]
}

export function AdvancedFilters({
  isOpen,
  onOpenChange,
  filters,
  onFiltersChange,
  availableCountries = [],
  availableRiskCategories = [],
  availableSources = []
}: AdvancedFiltersProps) {
  const updateFilters = (updates: Partial<RiskFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const resetToDefaults = () => {
    onFiltersChange(DEFAULT_FILTERS)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Advanced Risk Filters
          </SheetTitle>
          <SheetDescription>
            Configure detailed filtering criteria for comprehensive risk analysis
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Search & Keywords */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Label className="text-sm font-medium">Search & Keywords</Label>
            </div>
            <Input
              placeholder="Search headlines, content, keywords..."
              value={filters.searchKeywords}
              onChange={(e) => updateFilters({ searchKeywords: e.target.value })}
            />
          </div>

          <Separator />

          {/* Geographic Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <Label className="text-sm font-medium">Geographic Filters</Label>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Countries/Regions</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.countries.length > 0 
                      ? `${filters.countries.length} countries selected`
                      : "Select countries..."
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                  <DropdownMenuLabel>Countries & Regions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableCountries.map((country) => (
                    <DropdownMenuCheckboxItem
                      key={country}
                      checked={filters.countries.includes(country)}
                      onCheckedChange={(checked) => {
                        const newCountries = checked
                          ? [...filters.countries, country]
                          : filters.countries.filter(c => c !== country)
                        updateFilters({ countries: newCountries })
                      }}
                    >
                      {country}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {filters.countries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.countries.map((country) => (
                    <Badge key={country} variant="secondary" className="gap-1">
                      {country}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => updateFilters({ 
                          countries: filters.countries.filter(c => c !== country) 
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Industry Sectors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <Label className="text-sm font-medium">Industry Sectors</Label>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Industry Sectors</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.industrySectors.length > 0 
                      ? `${filters.industrySectors.length} sectors selected`
                      : "Select industry sectors..."
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                  <DropdownMenuLabel>Industry Sectors</DropdownMenuLabel>
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
                    >
                      {sector.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {filters.industrySectors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.industrySectors.map((sector) => (
                    <Badge key={sector} variant="secondary" className="gap-1">
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
          </div>

          <Separator />

          {/* Risk Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <Label className="text-sm font-medium">Risk Categories</Label>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {filters.riskCategories.length > 0 
                    ? `${filters.riskCategories.length} categories selected`
                    : "Select risk categories..."
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                <DropdownMenuLabel>Risk Categories</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableRiskCategories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={filters.riskCategories.includes(category)}
                    onCheckedChange={(checked) => {
                      const newCategories = checked
                        ? [...filters.riskCategories, category]
                        : filters.riskCategories.filter(c => c !== category)
                      updateFilters({ riskCategories: newCategories })
                    }}
                  >
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {filters.riskCategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.riskCategories.map((category) => (
                  <Badge key={category} variant="secondary" className="gap-1">
                    {category.replace(/_/g, ' ')}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateFilters({ 
                        riskCategories: filters.riskCategories.filter(c => c !== category) 
                      })}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Score Ranges */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <Label className="text-sm font-medium">Score Ranges</Label>
            </div>
            
            {/* Confidence Range */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Confidence Score</Label>
                <Badge variant="outline">
                  {filters.confidenceRange[0]}% - {filters.confidenceRange[1]}%
                </Badge>
              </div>
              <Slider
                value={filters.confidenceRange}
                onValueChange={(value) => updateFilters({ confidenceRange: value as [number, number] })}
                max={100}
                min={0}
                step={5}
              />
            </div>
            
            {/* Sentiment Range */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Sentiment Score</Label>
                <Badge variant="outline">
                  {filters.sentimentRange[0].toFixed(1)} to {filters.sentimentRange[1].toFixed(1)}
                </Badge>
              </div>
              <Slider
                value={filters.sentimentRange}
                onValueChange={(value) => updateFilters({ sentimentRange: value as [number, number] })}
                max={1}
                min={-1}
                step={0.1}
              />
            </div>
          </div>

          <Separator />

          {/* Financial Exposure section removed as requested */}

          <Separator />

          {/* News Source Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">News Sources</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {filters.sourceFilter.length > 0 
                    ? `${filters.sourceFilter.length} sources selected`
                    : "All sources"
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                <DropdownMenuLabel>News Sources</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableSources.map((source) => (
                  <DropdownMenuCheckboxItem
                    key={source}
                    checked={filters.sourceFilter.includes(source)}
                    onCheckedChange={(checked) => {
                      const newSources = checked
                        ? [...filters.sourceFilter, source]
                        : filters.sourceFilter.filter(s => s !== source)
                      updateFilters({ sourceFilter: newSources })
                    }}
                  >
                    {source}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />

          {/* Toggle Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Additional Filters</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="trending" className="text-sm">Trending Topics Only</Label>
                <Switch
                  id="trending"
                  checked={filters.trendingOnly}
                  onCheckedChange={(checked) => updateFilters({ trendingOnly: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="market-moving" className="text-sm">Market Moving Events</Label>
                <Switch
                  id="market-moving"
                  checked={filters.marketMovingOnly}
                  onCheckedChange={(checked) => updateFilters({ marketMovingOnly: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="action-required" className="text-sm">Requires Action</Label>
                <Switch
                  id="action-required"
                  checked={filters.requiresActionOnly}
                  onCheckedChange={(checked) => updateFilters({ requiresActionOnly: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="regulatory" className="text-sm">Regulatory News Only</Label>
                <Switch
                  id="regulatory"
                  checked={filters.regulatoryOnly}
                  onCheckedChange={(checked) => updateFilters({ regulatoryOnly: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              className="flex-1 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
            <Button 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
