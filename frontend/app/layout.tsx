import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar" // Assuming sidebar.tsx is in components/ui
import { Toaster } from "@/components/ui/toaster"
import { cookies } from "next/headers"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Risk Monitoring Dashboard",
  description: "Financial Risk Monitoring for International Bank",
    generator: 'v0.dev'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true" // [^1]

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <SidebarProvider defaultOpen={defaultOpen}>{children}</SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
