// Utility functions for risk scoring and color coding

export function getRiskScoreColor(score: number): string {
  if (score >= 9.0) return "bg-red-500 text-white"      // Critical
  if (score >= 7.0) return "bg-orange-500 text-white"   // High
  if (score >= 5.0) return "bg-yellow-500 text-black"   // Medium
  if (score >= 3.0) return "bg-green-500 text-white"    // Low
  return "bg-gray-500 text-white"                        // Minimal
}

export function getConfidenceScoreColor(score: number): string {
  if (score >= 90) return "bg-emerald-500 text-white"   // Very High Confidence
  if (score >= 75) return "bg-blue-500 text-white"      // High Confidence
  if (score >= 60) return "bg-yellow-500 text-black"    // Medium Confidence
  return "bg-gray-500 text-white"                        // Low Confidence
}

export function getSentimentColor(score: number): string {
  if (score >= 0.3) return "bg-green-500 text-white"    // Positive
  if (score >= -0.3) return "bg-gray-500 text-white"    // Neutral
  return "bg-red-500 text-white"                         // Negative
}

export function getImpactScoreColor(score: number): string {
  if (score >= 80) return "bg-purple-500 text-white"    // Very High Impact
  if (score >= 60) return "bg-pink-500 text-white"      // High Impact
  if (score >= 40) return "bg-blue-500 text-white"      // Medium Impact
  return "bg-gray-500 text-white"                        // Low Impact
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case "Critical": return "bg-red-600 text-white"
    case "High": return "bg-orange-500 text-white"
    case "Medium": return "bg-yellow-500 text-black"
    case "Low": return "bg-green-500 text-white"
    default: return "bg-gray-500 text-white"
  }
}

export function getTemporalImpactColor(impact: string): string {
  switch (impact) {
    case "Immediate": return "bg-red-500 text-white"
    case "Short-term": return "bg-orange-500 text-white"
    case "Medium-term": return "bg-blue-500 text-white"
    case "Long-term": return "bg-green-500 text-white"
    default: return "bg-gray-500 text-white"
  }
}

export function formatCurrency(amount: number): string {
  if (amount >= 1e9) {
    return `$${(amount / 1e9).toFixed(1)}B`
  } else if (amount >= 1e6) {
    return `$${(amount / 1e6).toFixed(1)}M`
  } else if (amount >= 1e3) {
    return `$${(amount / 1e3).toFixed(1)}K`
  }
  return `$${amount.toFixed(0)}`
}

export function formatSentiment(score: number): string {
  if (score >= 0.3) return "Positive"
  if (score >= -0.3) return "Neutral"
  return "Negative"
}

export function formatPercentage(score: number): string {
  return `${Math.round(score * 100)}%`
}
