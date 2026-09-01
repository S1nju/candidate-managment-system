"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { Fragment } from "react"

const routeMap: Record<string, string> = {
    dashboard: "Dashboard",
    candidates: "Candidates",
    forms: "Forms",
    signatures: "Signatures",
    users: "Users",
    audit: "Audit",
    "audit-logs": "Audit Logs",
    profile: "Profile",
    settings: "Settings",
    security: "Security",
    analytics: "Analytics",
    sign: "Sign Contract",
    edit: "Edit"
}

export function DashboardBreadcrumbs() {
    const pathname = usePathname()
    const paths = pathname.split("/").filter(Boolean)

    return (
        <nav className="flex items-center text-xs text-muted-foreground gap-2">
            <Link
                href="/dashboard"
                className="flex items-center gap-1 hover:text-primary transition-colors"
            >
                <Home className="w-3 h-3" />
            </Link>

            {paths.map((path, index) => {
                // Skip 'dashboard' if it's the first one to avoid "Dashboard > Dashboard"
                if (path === "dashboard" && index === 0) return null

                const href = `/${paths.slice(0, index + 1).join("/")}`
                const isLast = index === paths.length - 1

                // Try to get a readable label, otherwise capitalize the path fragment
                // If it's a numeric ID (like candidate ID), we might just show "Detail" or "Item" 
                // unless we want to do something more complex.
                let label = routeMap[path] || path.charAt(0).toUpperCase() + path.slice(1)

                // Handle potential IDs (simple check for now)
                if (!routeMap[path] && path.length > 10 && !isNaN(Number(path.charAt(0)))) {
                    label = "Detail"
                }

                return (
                    <Fragment key={href}>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        {isLast ? (
                            <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                                {label}
                            </span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-primary transition-colors whitespace-nowrap"
                            >
                                {label}
                            </Link>
                        )}
                    </Fragment>
                )
            })}
        </nav>
    )
}
