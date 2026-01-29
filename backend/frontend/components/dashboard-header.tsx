"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { useLanguage } from "@/context/language-context"
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs"
import { Separator } from "@/components/ui/separator"

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <DashboardBreadcrumbs />
      <div className="flex flex-1 items-center justify-end gap-2">
        <NotificationDropdown />
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <SunIcon className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("header.toggle_theme")}</span>
        </Button>
      </div>
    </header>
  )
}
