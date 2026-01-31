"use client"

import React, { useState } from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
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
import { Search, Filter, User as UserIcon } from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export default function AuditLogsPage() {
    useAuth({ middleware: "auth" })
    const { t } = useLanguage()

    const [search, setSearch] = useState("")
    const [action, setAction] = useState("all")
    const [userId, setUserId] = useState("all")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [page, setPage] = useState(1)
    const pageSize = 15

    // Fetch filter options (users and unique actions)
    const { data: filterOptions } = useSWR('/api/audit-logs/filters', () =>
        axios.get('/api/audit-logs/filters').then(res => res.data)
    )

    const { data: response, error, isLoading } = useSWR(
        `/api/audit-logs?page=${page}&per_page=${pageSize}&search=${search}&action=${action}&user_id=${userId}&start_date=${startDate}&end_date=${endDate}`,
        () => axios.get(`/api/audit-logs`, {
            params: {
                page,
                per_page: pageSize,
                search: search || undefined,
                action: action !== "all" ? action : undefined,
                user_id: userId !== "all" ? userId : undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined
            }
        }).then((res) => res.data)
    )

    const logs = response?.data || []
    const total = response?.total || 0
    const totalPages = response?.last_page || 0

    const getActionColor = (action: string) => {
        const a = action.toLowerCase()
        if (a.includes("signed")) return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
        if (a.includes("rejected")) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
        if (a.includes("created") || a.includes("uploaded")) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
        if (a.includes("assigned")) return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400"
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("sidebar.audit_logs")}</h1>
                    <p className="text-muted-foreground">
                        Monitor system activities and user actions.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-card p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                {/* Text Search */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("candidates.list.search_placeholder")}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            className="pl-9 h-9 bg-background border-slate-200"
                        />
                    </div>
                </div>

                {/* User Filter */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">User</label>
                    <Select value={userId} onValueChange={(val) => { setUserId(val); setPage(1); }}>
                        <SelectTrigger className="h-9 bg-background border-slate-200">
                            <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                            <SelectItem value="all">All Users</SelectItem>
                            {filterOptions?.users?.map((u: any) => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Action Filter */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Action</label>
                    <Select value={action} onValueChange={(val) => { setAction(val); setPage(1); }}>
                        <SelectTrigger className="h-9 bg-background border-slate-200">
                            <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                            <SelectItem value="all">All Actions</SelectItem>
                            {filterOptions?.actions?.map((a: string) => (
                                <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Start */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">From Date</label>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                        className="h-9 bg-background border-slate-200"
                    />
                </div>

                {/* Date End */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">To Date</label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                        className="h-9 bg-background border-slate-200"
                    />
                </div>
            </div>

            <div className="rounded-xl border shadow-sm overflow-hidden bg-card border-slate-200 dark:border-slate-800">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[180px]">Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
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
                                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm">
                                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-muted">
                                                <UserIcon className="w-3 h-3" />
                                            </div>
                                            <span className="font-medium text-sm">{log.user?.name || "System"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                                            {log.action.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground">
                                            {log.auditable_type?.split('\\').pop()}: {log.auditable_id}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[9px] font-mono cursor-default">
                                            {log.ip_address}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No logs found.
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
                        {t("candidates.list.pagination").replace("{page}", page.toString()).replace("{total}", totalPages.toString())}
                    </div>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>{t("common.next")}</Button>
                </div>
            )}
        </div>
    )
}
