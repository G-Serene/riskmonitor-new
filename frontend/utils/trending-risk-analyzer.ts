// This would typically be done on the backend, but showing the logic here
interface NewsItem {
  title: string
  content: string
  date: string
  sentiment_score: number
  country: string
  keywords: string[]
}

interface TrendingRiskTopic {
  topic: string
  mentions: number
  sentiment_avg: number
  velocity: number
  countries_affected: string[]
  risk_level: "low" | "medium" | "high" | "critical"
  trend_direction: "rising" | "declining" | "stable"
  related_keywords: string[]
  sample_headlines: string[]
  first_mentioned: string
  peak_date: string
  impact_score: number
}

export class TrendingRiskAnalyzer {
  // Extract topics from news items using NLP techniques
  static extractTopics(newsItems: NewsItem[]): Map<string, NewsItem[]> {
    const topicGroups = new Map<string, NewsItem[]>()

    // Common financial risk topics and their keywords
    const riskTopicKeywords = {
      "Interest Rate Changes": ["interest rate", "monetary policy", "fed", "central bank", "rate hike", "rate cut"],
      "Inflation Concerns": ["inflation", "cpi", "price increase", "cost of living", "purchasing power"],
      "Currency Volatility": ["currency", "exchange rate", "forex", "devaluation", "appreciation"],
      "Trade Wars": ["tariff", "trade war", "import duty", "export ban", "trade dispute"],
      "Geopolitical Tensions": ["sanctions", "conflict", "war", "diplomatic crisis", "political instability"],
      "Banking Crisis": ["bank failure", "credit crisis", "liquidity", "banking sector", "financial institution"],
      "Market Volatility": ["market crash", "volatility", "stock market", "bear market", "correction"],
      "Regulatory Changes": ["regulation", "compliance", "policy change", "regulatory framework"],
      "Cyber Security": ["cyber attack", "data breach", "ransomware", "security threat"],
      "Climate Risk": ["climate change", "natural disaster", "environmental risk", "carbon tax"],
      "Supply Chain": ["supply chain", "logistics", "shipping", "supply shortage", "bottleneck"],
      "Energy Crisis": ["energy price", "oil price", "gas shortage", "energy security"],
    }

    newsItems.forEach((item) => {
      const content = `${item.title} ${item.content}`.toLowerCase()

      Object.entries(riskTopicKeywords).forEach(([topic, keywords]) => {
        const matchCount = keywords.filter((keyword) => content.includes(keyword.toLowerCase())).length

        // If article matches multiple keywords for this topic, it's relevant
        if (
          matchCount >= 2 ||
          keywords.some((keyword) => content.includes(keyword) && content.split(keyword).length > 2)
        ) {
          if (!topicGroups.has(topic)) {
            topicGroups.set(topic, [])
          }
          topicGroups.get(topic)!.push(item)
        }
      })
    })

    return topicGroups
  }

  // Calculate trending metrics for each topic
  static calculateTrendingMetrics(
    topicGroups: Map<string, NewsItem[]>,
    timeWindow = 7, // days
  ): TrendingRiskTopic[] {
    const now = new Date()
    const windowStart = new Date(now.getTime() - timeWindow * 24 * 60 * 60 * 1000)

    return Array.from(topicGroups.entries())
      .map(([topic, articles]) => {
        // Filter articles within time window
        const recentArticles = articles.filter((article) => new Date(article.date) >= windowStart)

        // Calculate daily mention counts for velocity
        const dailyCounts = this.getDailyCounts(recentArticles, timeWindow)
        const velocity = this.calculateVelocity(dailyCounts)

        // Calculate average sentiment
        const sentimentAvg =
          recentArticles.reduce((sum, article) => sum + article.sentiment_score, 0) / recentArticles.length

        // Get affected countries
        const countriesAffected = [...new Set(recentArticles.map((a) => a.country))]

        // Calculate impact score based on mentions, sentiment, and countries affected
        const impactScore = this.calculateImpactScore(
          recentArticles.length,
          Math.abs(sentimentAvg),
          countriesAffected.length,
          velocity,
        )

        // Determine risk level
        const riskLevel = this.determineRiskLevel(impactScore, velocity, sentimentAvg)

        // Get sample headlines (top 3 most relevant)
        const sampleHeadlines = recentArticles
          .sort((a, b) => Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score))
          .slice(0, 3)
          .map((a) => a.title)

        return {
          topic,
          mentions: recentArticles.length,
          sentiment_avg: sentimentAvg,
          velocity,
          countries_affected: countriesAffected,
          risk_level: riskLevel,
          trend_direction: velocity > 0.1 ? "rising" : velocity < -0.1 ? "declining" : "stable",
          related_keywords: this.extractKeywords(recentArticles),
          sample_headlines: sampleHeadlines,
          first_mentioned: articles[0]?.date || "",
          peak_date: this.findPeakDate(dailyCounts),
          impact_score: impactScore,
        }
      })
      .filter((topic) => topic.mentions >= 3) // Only include topics with sufficient mentions
      .sort((a, b) => b.impact_score - a.impact_score) // Sort by impact score
  }

  private static getDailyCounts(articles: NewsItem[], days: number): number[] {
    const counts = new Array(days).fill(0)
    const now = new Date()

    articles.forEach((article) => {
      const articleDate = new Date(article.date)
      const daysAgo = Math.floor((now.getTime() - articleDate.getTime()) / (24 * 60 * 60 * 1000))
      if (daysAgo >= 0 && daysAgo < days) {
        counts[days - 1 - daysAgo]++
      }
    })

    return counts
  }

  private static calculateVelocity(dailyCounts: number[]): number {
    if (dailyCounts.length < 2) return 0

    const firstHalf = dailyCounts.slice(0, Math.floor(dailyCounts.length / 2))
    const secondHalf = dailyCounts.slice(Math.floor(dailyCounts.length / 2))

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    return firstAvg === 0 ? 0 : (secondAvg - firstAvg) / firstAvg
  }

  private static calculateImpactScore(
    mentions: number,
    sentimentMagnitude: number,
    countriesCount: number,
    velocity: number,
  ): number {
    // Weighted scoring algorithm
    const mentionScore = Math.min(mentions / 10, 1) * 30 // Max 30 points
    const sentimentScore = sentimentMagnitude * 25 // Max 25 points
    const geographicScore = Math.min(countriesCount / 5, 1) * 20 // Max 20 points
    const velocityScore = Math.min(Math.abs(velocity), 1) * 25 // Max 25 points

    return mentionScore + sentimentScore + geographicScore + velocityScore
  }

  private static determineRiskLevel(
    impactScore: number,
    velocity: number,
    sentiment: number,
  ): "low" | "medium" | "high" | "critical" {
    if (impactScore > 80 || (velocity > 0.5 && Math.abs(sentiment) > 0.7)) {
      return "critical"
    } else if (impactScore > 60 || (velocity > 0.3 && Math.abs(sentiment) > 0.5)) {
      return "high"
    } else if (impactScore > 40 || velocity > 0.1) {
      return "medium"
    } else {
      return "low"
    }
  }

  private static extractKeywords(articles: NewsItem[]): string[] {
    const keywordFreq = new Map<string, number>()

    articles.forEach((article) => {
      article.keywords.forEach((keyword) => {
        keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1)
      })
    })

    return Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword)
  }

  private static findPeakDate(dailyCounts: number[]): string {
    const maxIndex = dailyCounts.indexOf(Math.max(...dailyCounts))
    const peakDate = new Date()
    peakDate.setDate(peakDate.getDate() - (dailyCounts.length - 1 - maxIndex))
    return peakDate.toISOString().split("T")[0]
  }
}
