"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { Fragment } from "react"
import { getCandidateDisplayName } from "@/lib/candidate-name"
import useSWR from "swr"
import { useLanguage } from "@/context/language-context"

const routeKeyMap: Record<string, string> = {
    dashboard: "breadcrumbs.dashboard",
    candidates: "breadcrumbs.candidates",
    forms: "breadcrumbs.forms",
    library: "breadcrumbs.library",
    "email-contracts": "breadcrumbs.email_contracts",
    signatures: "breadcrumbs.signatures",
    users: "breadcrumbs.users",
    audit: "breadcrumbs.audit",
    "audit-logs": "breadcrumbs.audit_logs",
    profile: "breadcrumbs.profile",
    settings: "breadcrumbs.settings",
    security: "breadcrumbs.security",
    analytics: "breadcrumbs.analytics",
    sign: "breadcrumbs.sign",
    edit: "breadcrumbs.edit",
}

export function DashboardBreadcrumbs() {
    const pathname = usePathname()
    const { t } = useLanguage()
    const paths = pathname.split("/").filter(Boolean)

    // Detail routes: show the entity name instead of its numeric id (shares SWR cache with the pages)
    const entityFields: Record<string, string> = { candidates: "name", forms: "title" }
    const entityIdx = paths.findIndex((p, i) => p in entityFields && /^\d+$/.test(paths[i + 1] ?? ""))
    const entityId = entityIdx !== -1 ? paths[entityIdx + 1] : null
    const { data: entity } = useSWR(entityId ? `/api/${paths[entityIdx]}/${entityId}` : null)
    const entityName: string = !entityId
        ? ""
        : paths[entityIdx] === "candidates"
            ? getCandidateDisplayName(entity)
            : (entity?.[entityFields[paths[entityIdx]]] ?? "")

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
                const routeKey = routeKeyMap[path]
                let label = routeKey ? t(routeKey) : path.charAt(0).toUpperCase() + path.slice(1)

                // Handle potential IDs (simple check for now)
                if (entityId && index === entityIdx + 1) {
                    label = entityName || t("breadcrumbs.detail")
                } else if (!routeKey && path.length > 10 && !isNaN(Number(path.charAt(0)))) {
                    label = t("breadcrumbs.detail")
                }

                return (
                    <Fragment key={href}>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        {isLast ? (
                            <span className="font-semibold text-foreground truncate max-w-[220px]">
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
