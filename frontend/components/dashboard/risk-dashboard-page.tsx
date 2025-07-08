import RiskDashboardContent from "@/components/dashboard/risk-dashboard-content"

export default function RiskDashboardPage() {
  return (
    <div className="flex min-h-screen w-full bg-muted/40 dashboard-container">
      <div className="flex flex-col flex-1 min-h-0">
        <RiskDashboardContent />
      </div>
    </div>
  )
}
