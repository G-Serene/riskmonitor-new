"use client"

import { useState, useEffect } from "react"
import { Bell, X, RefreshCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TimeWindow, isLiveTimeWindow } from "@/lib/api-client"

interface LiveUpdatesNotificationProps {
  currentTimeWindow: TimeWindow
  hasLiveUpdates: boolean
  pendingUpdatesCount: number
  onSwitchToLive: () => void
  onRefresh: () => void
  onDismiss: () => void
  className?: string
}

export function LiveUpdatesNotification({
  currentTimeWindow,
  hasLiveUpdates,
  pendingUpdatesCount,
  onSwitchToLive,
  onRefresh,
  onDismiss,
  className
}: LiveUpdatesNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Show notification when:
  // 1. Not viewing live time window AND
  // 2. There are pending live updates
  useEffect(() => {
    const shouldShow = !isLiveTimeWindow(currentTimeWindow) && hasLiveUpdates && pendingUpdatesCount > 0
    setIsVisible(shouldShow)
  }, [currentTimeWindow, hasLiveUpdates, pendingUpdatesCount])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss()
  }

  const handleSwitchToLive = () => {
    setIsVisible(false)
    onSwitchToLive()
  }

  const handleRefresh = () => {
    onRefresh()
  }

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 w-80 max-w-[90vw]",
        className
      )}
    >
        <Card className="border-red-200 bg-red-50 shadow-lg">
          <CardContent className="p-4">
            {!isMinimized ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Bell className="h-4 w-4 text-red-600 animate-pulse" />
                      <span className="font-medium text-red-900">Live Updates Available</span>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {pendingUpdatesCount}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMinimized(true)}
                      className="h-6 w-6 p-0 text-red-700 hover:bg-red-100"
                    >
                      <span className="sr-only">Minimize</span>
                      <div className="h-1 w-3 bg-current" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="h-6 w-6 p-0 text-red-700 hover:bg-red-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-red-800">
                  <p className="mb-2">
                    {pendingUpdatesCount} new update{pendingUpdatesCount !== 1 ? 's' : ''} available while viewing historical data.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <Clock className="h-3 w-3" />
                    <span>Currently viewing: {getCurrentTimeWindowLabel(currentTimeWindow)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSwitchToLive}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Switch to Live
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh Current
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-red-600 animate-pulse" />
                  <Badge variant="destructive" className="text-xs">
                    {pendingUpdatesCount}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(false)}
                    className="h-6 w-6 p-0 text-red-700 hover:bg-red-100"
                  >
                    <span className="sr-only">Expand</span>
                    <Bell className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="h-6 w-6 p-0 text-red-700 hover:bg-red-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
                     </CardContent>
         </Card>
       </div>
   )
 }

function getCurrentTimeWindowLabel(timeWindow: TimeWindow): string {
  switch (timeWindow) {
    case "1h": return "Last Hour"
    case "4h": return "Last 4 Hours"
    case "8h": return "Last 8 Hours"
    case "12h": return "Last 12 Hours"
    case "today": return "Today"
    case "yesterday": return "Yesterday"
    case "3d": return "Last 3 Days"
    case "7d": return "Last 7 Days"
    case "14d": return "Last 14 Days"
    case "1m": return "Last Month"
    case "3m": return "Last 3 Months"
    case "6m": return "Last 6 Months"
    case "custom": return "Custom Range"
    default: return "Unknown"
  }
} 