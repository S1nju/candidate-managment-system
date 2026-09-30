"use client"

import React, { useState } from "react"
import useSWR from "swr"
import { auditApi } from "@/services/api"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/hooks/use-auth"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { getCandidateDisplayName } from "@/lib/candidate-name"
import { Search, Filter, User as UserIcon, ExternalLink } from "lucide-react"

export default function AuditPage() {
    const { user } = useAuth({ middleware: "auth" })
    const { t } = useLanguage()

    const [search, setSearch] = useState("")
    const [action, setAction] = useState("all")
    const [userId, setUserId] = useState("all")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [page, setPage] = useState(1)
    const pageSize = 15

    const isAdmin = user?.roles?.some((r: any) => r.name === 'admin')

    // Fetch filter options using domain API
    const { data: filterOptions } = useSWR(isAdmin ? '/api/audit-logs/filters' : null, () =>
        auditApi.getAuditFilters()
    )

    const { data: response, error, isLoading } = useSWR(
        isAdmin ? `/api/audit-logs?page=${page}&per_page=${pageSize}&search=${search}&action=${action}&user_id=${userId}&start_date=${startDate}&end_date=${endDate}` : null,
        () => auditApi.getAuditLogs({
            page,
            per_page: pageSize,
            search: search || undefined,
            action: action !== "all" ? action : undefined,
            user_id: userId !== "all" ? userId : undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined
        })
    )


    const logs = response?.data || []
    const total = response?.total || 0
    const totalPages = response?.last_page || 0

    const getEntityTypeLabel = (type?: string) => {
        const basename = type?.split('\\').pop()
        if (!basename) return t("audit.table.entity")
        const key = `audit.entities.${basename}`
        const label = t(key)
        return label === key ? basename : label
    }

    const getActionLabel = (a: string) => {
        const key = `audit.actions.${a}`
        const label = t(key)
        return label === key ? a.replace(/_/g, " ") : label
    }

    const getActionColor = (action: string) => {
        const a = action.toLowerCase()
        if (a.includes("signed")) return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900"
        if (a.includes("rejected") || a.includes("deleted")) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900"
        if (a.includes("created") || a.includes("uploaded")) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900"
        if (a.includes("assigned")) return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900"
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700"
    }

    if (user && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold text-red-600">{t("audit.access_denied_title")}</h2>
                <p className="text-muted-foreground mt-2">{t("audit.access_denied_desc")}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("sidebar.audit_logs")}</h1>
                    <p className="text-muted-foreground">
                        {t("audit.subtitle")}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-card p-4 rounded-xl border shadow-sm">
                {/* Text Search */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{t("audit.search_label")}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("common.search")}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            className="pl-9 h-9 bg-background"
                        />
                    </div>
                </div>

                {/* User Filter */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{t("audit.user_label")}</label>
                    <Select value={userId} onValueChange={(val) => { setUserId(val); setPage(1); }}>
                        <SelectTrigger className="h-9 bg-background">
                            <SelectValue placeholder={!filterOptions ? t("common.loading") : t("audit.all_users")} />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                            <SelectItem value="all">{t("audit.all_users")}</SelectItem>
                            {filterOptions?.users?.map((u: any) => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Action Filter */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{t("audit.action_label")}</label>
                    <Select value={action} onValueChange={(val) => { setAction(val); setPage(1); }}>
                        <SelectTrigger className="h-9 bg-background">
                            <SelectValue placeholder={!filterOptions ? t("common.loading") : t("audit.action_label")} />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                            <SelectItem value="all">{t("audit.all_actions")}</SelectItem>
                            {filterOptions?.actions?.map((a: string) => (
                                <SelectItem key={a} value={a}>{getActionLabel(a)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Start */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{t("audit.from_date")}</label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="h-9 bg-background"
                    />
                </div>

                {/* Date End */}
                <div className="space-y-2 relative">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{t("audit.to_date")}</label>
                    <div className="flex gap-2">
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="h-9 bg-background"
                        />
                        {(search || action !== 'all' || userId !== 'all' || startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                    setSearch("")
                                    setAction("all")
                                    setUserId("all")
                                    setStartDate("")
                                    setEndDate("")
                                    setPage(1)
                                }}
                            >
                                {t("audit.clear")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[180px] font-semibold text-slate-900 dark:text-slate-100">{t("audit.table.date")}</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("audit.table.user")}</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("audit.table.action")}</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("audit.table.entity")}</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("audit.table.ip_address")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                </TableRow>
                            ))
                        ) : logs.length > 0 ? (
                            logs.map((log: any) => (
                                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors text-slate-700 dark:text-slate-300">
                                    <TableCell className="text-sm">
                                        {format(new Date(log.created_at), "dd-MM-yyyy HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{log.user?.name || t("audit.system")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                                            {getActionLabel(log.action)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs flex flex-col gap-1">
                                            {log.auditable ? (
                                                <Link
                                                    href={log.auditable_type.includes('Candidate')
                                                        ? `/dashboard/candidates/${log.auditable_id}`
                                                        : `/dashboard/documents`
                                                    }
                                                    className="font-medium text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {log.auditable_type.includes('Candidate') ? getCandidateDisplayName(log.auditable) : log.auditable.first_name ? `${log.auditable.first_name} ${log.auditable.last_name}` : (log.auditable.name || log.auditable.title || `${getEntityTypeLabel(log.auditable_type)} #${log.auditable_id}`)}
                                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                                </Link>
                                            ) : (
                                                <div className="flex flex-col text-muted-foreground italic">
                                                    {log.metadata?.subject_name && <span className="font-medium not-italic text-foreground">{log.metadata.subject_name}</span>}
                                                    <span>{getEntityTypeLabel(log.auditable_type)}</span>
                                                    <span className="font-mono text-[10px]">#{log.auditable_id}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[10px] font-mono bg-muted/50 text-muted-foreground">
                                            {log.ip_address || '-'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                    {t("audit.no_logs")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>{t("common.previous")}</Button>
                    <div className="flex items-center text-sm font-medium">
                        {t("common.pagination").replace("{page}", page.toString()).replace("{total}", totalPages.toString())}
                    </div>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>{t("common.next")}</Button>
                </div>
            )}
        </div>
    )
}
