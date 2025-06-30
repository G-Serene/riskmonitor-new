"use client"

import { Wifi, WifiOff, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ConnectionStatusProps {
  isConnected: boolean
  lastUpdate: string | null
  error: string | null
}

export function ConnectionStatus({ isConnected, lastUpdate, error }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Wifi className="h-3 w-3 mr-1" />
          Live Updates
        </Badge>
      ) : (
        <Badge variant="outline" className="text-red-600 border-red-600">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )}

      {lastUpdate && (
        <span className="text-xs text-muted-foreground">Last: {new Date(lastUpdate).toLocaleTimeString()}</span>
      )}

      {error && (
        <Alert className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">Connection issue: {error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
