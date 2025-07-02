import { AppSidebar } from "@/components/dashboard/app-sidebar"
import RiskDashboardContent from "@/components/dashboard/risk-dashboard-content"

export default function RiskDashboardPage() {
  return (
    <div className="flex h-screen w-full bg-muted/40 overflow-hidden dashboard-container">
      <AppSidebar /> {/* [^1] */}
      {/* Using SidebarInset for proper spacing if sidebar variant="inset" was used.
          For default variant, a simple main tag or div is also fine.
          Let's assume AppSidebar might use variant="inset" or we want that style.
          If not using "inset", this can be a regular <main> tag.
          The provided Sidebar component structure suggests `SidebarInset` for main content when sidebar is "inset".
          If sidebar is not "inset", then `main` tag directly is fine.
          Let's use a structure that works well with the default sidebar behavior.
      */}
      <div className="flex flex-col flex-1 overflow-hidden h-full">
        {" "}
        {/* This div will contain the header and main content */}
        <RiskDashboardContent />
      </div>
    </div>
  )
}
