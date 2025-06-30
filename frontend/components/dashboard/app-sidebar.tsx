"use client"

import Link from "next/link"
import {
  Banknote,
  Bell,
  ChevronDown,
  Globe,
  Home,
  LineChart,
  ListChecks,
  Newspaper,
  Settings,
  ShieldAlert,
  Users,
  Building,
  MapPin,
  FileText,
  Briefcase,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar" // [^1]
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const primaryMenuItems = [
  { title: "Dashboard", href: "#", icon: Home, current: true },
  { title: "News Feed", href: "#", icon: Newspaper },
  { title: "Global Heatmap", href: "#", icon: Globe },
  { title: "Alerts", href: "#", icon: Bell, badge: "12" },
]

const analysisMenuItems = [
  { title: "Geopolitical", href: "#", icon: MapPin },
  { title: "Economic", href: "#", icon: LineChart },
  { title: "Market", href: "#", icon: Banknote },
  { title: "Regulatory", href: "#", icon: ShieldAlert },
  { title: "Credit Risk", href: "#", icon: Briefcase },
]

const resourcesMenuItems = [
  { title: "Country Profiles", href: "#", icon: Building },
  { title: "Watchlists", href: "#", icon: ListChecks },
  { title: "Reports", href: "#", icon: FileText },
]

export function AppSidebar() {
  const { state } = useSidebar()
  return (
    <Sidebar collapsible="icon" side="left" className="border-r">
      <SidebarHeader className="p-4 border-b">
        <Link href="#" className="flex items-center gap-2 font-semibold">
          <Banknote className="h-6 w-6 text-primary" />
          {state === "expanded" && <span className="text-lg">RiskGuard AI</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.current} tooltip={item.title}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                      {item.badge && state === "expanded" && (
                        <span className="ml-auto inline-block rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Collapsible defaultOpen className="group/collapsible px-2">
          <SidebarGroup>
            <SidebarGroupLabel>
              <CollapsibleTrigger className="flex items-center justify-between w-full [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3">
                  <LineChart className="h-5 w-5" />
                  {state === "expanded" && <span>Risk Analysis</span>}
                </div>
                {state === "expanded" && <ChevronDown className="h-4 w-4 transition-transform duration-200" />}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarMenuSub className="pl-4">
                {analysisMenuItems.map((item) => (
                  <SidebarMenuSubItem key={item.title}>
                    <SidebarMenuSubButton asChild>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 items-center p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-user.jpg" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              {state === "expanded" && (
                <div className="text-left">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">Risk Analyst</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
