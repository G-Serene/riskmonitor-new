import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    appName: 'Risk Monitor Dashboard',
    version: '1.0.0',
    apiUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000',
    features: {
      realTimeUpdates: true,
      notifications: true,
      export: true
    }
  })
} 