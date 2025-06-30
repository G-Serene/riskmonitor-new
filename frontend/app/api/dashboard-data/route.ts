import { NextResponse } from "next/server"

// This route is now deprecated - the frontend connects directly to the FastAPI backend
// Keeping it for backward compatibility during development

export async function GET() {
  try {
    // In development, you might want to proxy to your FastAPI backend
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

    const response = await fetch(`${BACKEND_URL}/api/risk/dashboard`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Proxy API Error:", error)
    return NextResponse.json({ error: "Failed to fetch data from backend" }, { status: 500 })
  }
}
