"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboardIcon, UserIcon, HomeIcon, FileTextIcon, ClipboardListIcon, ShieldIcon, FileCheckIcon, MailIcon, LibraryIcon, UsersIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/user-nav"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/context/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useLanguage()
  const isAdmin = user?.roles?.some((r: any) => r.name === 'admin')

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <HomeIcon className="size-4" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">signMe</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard - Standalone */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <LayoutDashboardIcon className="size-4" />
                    <span>{t("sidebar.dashboard")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Group */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.management")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/candidates")}>
                  <Link href="/dashboard/candidates">
                    <UserIcon className="size-4" />
                    <span>{t("sidebar.candidates")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/signatures")}>
                  <Link href="/dashboard/signatures">
                    <FileCheckIcon className="size-4" />
                    <span>{t("sidebar.signatures")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/forms")}>
                    <Link href="/dashboard/forms">
                      <ClipboardListIcon className="size-4" />
                      <span>{t("sidebar.forms")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/email-contracts")}>
                    <Link href="/dashboard/email-contracts">
                      <MailIcon className="size-4" />
                      <span>{t("sidebar.email_contracts")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/library")}>
                    <Link href="/dashboard/library">
                      <LibraryIcon className="size-4" />
                      <span>{t("sidebar.library")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Group (Admin only or always visible) */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.system")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/audit")}>
                  <Link href="/dashboard/audit">
                    <ClipboardListIcon className="size-4" />
                    <span>{t("sidebar.audit_logs")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/users")}>
                      <Link href="/dashboard/users">
                        <UsersIcon className="size-4" />
                        <span>{t("sidebar.users")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/roles")}>
                      <Link href="/dashboard/admin/roles">
                        <ShieldIcon className="size-4" />
                        <span>{t("sidebar.roles")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/dashboard/security"}>
                      <Link href="/dashboard/security">
                        <ShieldIcon className="size-4" />
                        <span>{t("sidebar.security")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4 gap-4">
        <LanguageSwitcher />
        <UserNav />
      </SidebarFooter>
    </Sidebar >
  )
}
