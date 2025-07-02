"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Clock, CalendarDays } from "lucide-react"
import { TimeWindow, TIME_WINDOW_OPTIONS, DateRange } from "@/lib/api-client"

interface TimeWindowSelectorProps {
  value: TimeWindow
  onChange: (value: TimeWindow) => void
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange) => void
  className?: string
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}

export function TimeWindowSelector({ 
  value, 
  onChange, 
  dateRange, 
  onDateRangeChange, 
  className 
}: TimeWindowSelectorProps) {
  const selectedOption = TIME_WINDOW_OPTIONS.find(option => option.value === value)

  const handleDateRangeSelect = (range: DateRange) => {
    if (onDateRangeChange) {
      onDateRangeChange(range)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">Time Window:</span>
        <span className="sm:hidden">Period:</span>
      </div>
      
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-auto min-w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_WINDOW_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Custom Date Range Picker - only show when "custom" is selected */}
      {value === "custom" && onDateRangeChange && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {dateRange?.from ? formatDate(dateRange.from) : "From"}
                </span>
                <span className="sm:hidden">From</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange?.from}
                onSelect={(date) => handleDateRangeSelect({ ...dateRange, from: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground text-sm">to</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {dateRange?.to ? formatDate(dateRange.to) : "To"}
                </span>
                <span className="sm:hidden">To</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange?.to}
                onSelect={(date) => handleDateRangeSelect({ ...dateRange, to: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

    </div>
  )
}
