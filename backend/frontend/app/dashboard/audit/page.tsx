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
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Search, Filter, User as UserIcon, ExternalLink } from "lucide-react"

export default function AuditPage() {
    const { user } = useAuth({ middleware: "auth" })
    const { t } = useLanguage()

    const [search, setSearch] = useState("")
    const [action, setAction] = useState("all")
    const [page, setPage] = useState(1)
    const pageSize = 15

    const isAdmin = user?.roles?.some((r: any) => r.name === 'admin')

    const { data: response, error, isLoading } = useSWR(
        isAdmin ? `/api/audit-logs?page=${page}&per_page=${pageSize}${search ? `&search=${search}` : ""}${action !== "all" ? `&action=${action}` : ""}` : null,
        () => axios.get(`/api/audit-logs`, {
            params: {
                page,
                per_page: pageSize,
                search: search || undefined,
                action: action !== "all" ? action : undefined
            }
        }).then((res) => res.data)
    )

    const logs = response?.data || []
    const total = response?.total || 0
    const totalPages = response?.last_page || 0

    const getActionColor = (action: string) => {
        if (action.includes("signed")) return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
        if (action.includes("rejected")) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
        if (action.includes("created")) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400"
    }

    if (user && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                <p className="text-muted-foreground mt-2">You do not have permission to view audit logs.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("sidebar.audit_logs")}</h1>
                    <p className="text-muted-foreground">
                        Track all system activities and document history.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between pb-2">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("candidates.list.search_placeholder")}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                        className="pl-9 h-10 bg-card"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={action} onValueChange={(val) => {
                        setAction(val)
                        setPage(1)
                    }}>
                        <SelectTrigger className="w-[180px] h-10 bg-card">
                            <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                            <SelectItem value="all">{t("common.all")}</SelectItem>
                            <SelectItem value="contract_signed">Contract Signed</SelectItem>
                            <SelectItem value="contract_rejected">Contract Rejected</SelectItem>
                            <SelectItem value="document_uploaded">Document Uploaded</SelectItem>
                            <SelectItem value="document_signed">Document Signed</SelectItem>
                            <SelectItem value="document_assigned">Document Assigned</SelectItem>
                            <SelectItem value="document_rejected">Document Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl border shadow-sm overflow-hidden bg-card border-slate-200 dark:border-slate-800">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                            <TableHead className="w-[180px] font-semibold text-slate-900 dark:text-slate-100">Date</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">User</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Action</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Entity</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">IP Address</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={i} className="border-slate-200 dark:border-slate-800">
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                </TableRow>
                            ))
                        ) : logs.length > 0 ? (
                            logs.map((log: any) => (
                                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                    <TableCell className="text-sm">
                                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{log.user?.name || "System"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                                            {log.action.replace(/_/g, " ")}
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
                                                    {log.auditable.name || log.auditable.title || `${log.auditable_type.split('\\').pop()} #${log.auditable_id}`}
                                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                                </Link>
                                            ) : (
                                                <div className="flex flex-col text-muted-foreground italic">
                                                    <span>{log.auditable_type?.split('\\').pop() || 'Entity'}</span>
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
                                    No activity logs found.
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
