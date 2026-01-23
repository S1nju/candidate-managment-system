"use client"

import { useState } from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  UserIcon,
  Search,
  Filter,
  PenToolIcon,
  EyeIcon,
  Mail,
  Phone
} from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"

interface Candidate {
  id: number
  name: string
  email: string
  phone: string
  position: string
  contract_type: string
  created_at: string
  signature_id: number | null
  contract_status?: string
  contract_path?: string
}

export function CandidateList() {
  const { t } = useLanguage()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 15

  const { data: response, error, isLoading } = useSWR(
    "/api/candidates",
    () => axios.get("/api/candidates").then((res) => res.data)
  )

  // Client-side filtering for now since API might not support it yet
  let candidates = (response?.data as Candidate[] || [])

  if (search) {
    const lowerSearch = search.toLowerCase()
    candidates = candidates.filter(c =>
      c.name.toLowerCase().includes(lowerSearch) ||
      c.email.toLowerCase().includes(lowerSearch)
    )
  }

  if (status !== "all") {
    candidates = candidates.filter(c => {
      if (status === "signed") return c.contract_status === "signed"
      if (status === "pending") return c.contract_status === "pending"
      if (status === "rejected") return c.contract_status === "rejected"
      return true
    })
  }

  // Pagination logic (client-side for now)
  const total = candidates.length
  const totalPages = Math.ceil(total / pageSize)
  const paginatedCandidates = candidates.slice((page - 1) * pageSize, page * pageSize)

  const getStatusColor = (status: string) => {
    if (status === "signed") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
    if (status === "rejected") return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
    return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
  }

  const getStatusLabel = (status: string) => {
    if (status === "signed") return t("candidates.list.signed")
    if (status === "rejected") return t("candidates.list.rejected")
    return t("candidates.list.pending")
  }

  if (error) {
    return <div className="text-red-500 p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-900/30 font-medium">{t("common.error")}</div>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between pb-2">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("candidates.list.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-card"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] h-10 bg-card">
              <SelectValue placeholder={t("candidates.list.filter_status")} />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">{t("candidates.list.all_statuses")}</SelectItem>
              <SelectItem value="pending">{t("candidates.list.pending")}</SelectItem>
              <SelectItem value="signed">{t("candidates.list.signed")}</SelectItem>
              <SelectItem value="rejected">{t("candidates.list.rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border shadow-sm overflow-hidden bg-card border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
              <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("candidates.list.table.name")}</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("candidates.list.table.contact")}</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("candidates.list.table.position")}</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("candidates.list.table.status")}</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-100">{t("candidates.list.table.created_at")}</TableHead>
              <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-100">{t("candidates.list.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-slate-200 dark:border-slate-800">
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : paginatedCandidates.length > 0 ? (
              paginatedCandidates.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30 transition-colors border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted text-slate-600 dark:text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-slate-900 dark:text-slate-100 font-semibold">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm text-muted-foreground">
                      <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</div>
                      {c.phone && <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {c.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>{c.position}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize px-2 py-0.5 font-medium border shadow-none ${getStatusColor(c.contract_status || "pending")}`}>
                      {getStatusLabel(c.contract_status || "pending")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-100/50 text-sm">
                    {c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(!c.signature_id && c.contract_status === 'pending') ? (
                        <div className="flex gap-1">
                          <Link href={`/dashboard/candidates/${c.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-primary"
                              title={t("candidates.list.actions.view")}
                            >
                              <EyeIcon className="w-4 h-4 mr-2" />
                              {t("candidates.list.actions.view")}
                            </Button>
                          </Link>
                          <Link href={`/dashboard/candidates/${c.id}/sign`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10 dark:text-primary dark:hover:bg-primary/20"
                            >
                              <PenToolIcon className="w-4 h-4 mr-2" />
                              {t("candidates.list.actions.sign")}
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <Link href={`/dashboard/candidates/${c.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-primary dark:hover:text-primary"
                            title={t("candidates.list.actions.view")}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t("candidates.list.no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
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
