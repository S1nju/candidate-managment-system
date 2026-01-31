"use client"

import { useState, useEffect } from "react"
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
  EyeIcon,
  Mail,
  Phone,
  Send,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/hooks/use-auth"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { EmailEditorDialog } from "@/components/candidates/email-editor-dialog"

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
  assigned_to?: number
  assigned_to_user?: any
  form?: {
    id: number
    title: string
  }
}

export function CandidateList() {
  const { t } = useLanguage()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.roles?.some((r: any) => r.name === 'admin')

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isEmailOpen, setIsEmailOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const queryParams = new URLSearchParams({
    page: page.toString(),
    search: debouncedSearch,
    status: status,
    per_page: "15"
  })

  const { data: response, error, isLoading, mutate } = useSWR(`/api/candidates?${queryParams.toString()}`)
  const { data: workers } = useSWR(isAdmin ? "/api/admin/users" : null)

  const candidates = (response?.data as Candidate[] || [])
  const pagination = {
    current_page: response?.current_page || 1,
    last_page: response?.last_page || 1,
    total: response?.total || 0,
    per_page: response?.per_page || 15
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length && candidates.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(candidates.map(c => c.id))
    }
  }

  const handleAssign = async (candidateId: number, workerId: string) => {
    try {
      await axios.post(`/api/candidates/${candidateId}/assign`, { assigned_to: workerId })
      toast({ title: "Candidate assigned" })
      mutate()
    } catch (error) {
      toast({ title: "Failed to assign", variant: "destructive" })
    }
  }

  const handleStatusChange = (val: string) => {
    setStatus(val)
    setPage(1) // Reset to first page on filter change
  }

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
    return <div className="text-red-500 p-4 border rounded-lg bg-red-50 font-medium">{t("common.error")}</div>
  }

  return (
    <div className="space-y-4">
      {/* Filters & Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between pb-2">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("candidates.list.search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-card"
            />
          </div>
          {isAdmin && selectedIds.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setIsEmailOpen(true)} className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Email ({selectedIds.length})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={status} onValueChange={handleStatusChange}>
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
            <TableRow>
              {isAdmin && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === candidates.length && candidates.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold">{t("candidates.list.table.name")}</TableHead>
              <TableHead className="font-semibold">{t("candidates.list.table.contact")}</TableHead>
              <TableHead className="font-semibold">{t("candidates.list.table.form")}</TableHead>
              <TableHead className="font-semibold">{t("candidates.list.table.position")}</TableHead>
              <TableHead className="font-semibold">{t("candidates.list.table.status")}</TableHead>
              {isAdmin && <TableHead className="font-semibold">{t("candidates.list.table.assigned_to")}</TableHead>}
              <TableHead className="text-right font-semibold">{t("candidates.list.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 15 }).map((_, i) => (
                <TableRow key={i}>
                  {isAdmin && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  {isAdmin && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : candidates.length > 0 ? (
              candidates.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                  {isAdmin && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm text-muted-foreground">
                      <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</div>
                      {c.phone && <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {c.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.form ? (
                      <Badge variant="outline" className="font-normal">{c.form.title}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">{t("common.all")}</span>
                    )}
                  </TableCell>
                  <TableCell>{c.position}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize px-2 py-0.5 font-medium ${getStatusColor(c.contract_status || "pending")}`}>
                      {getStatusLabel(c.contract_status || "pending")}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Select
                        value={c.assigned_to?.toString() || "unassigned"}
                        onValueChange={(val) => handleAssign(c.id, val === "unassigned" ? "" : val)}
                      >
                        <SelectTrigger className="h-8 border-none bg-transparent hover:bg-muted/50 w-[140px] text-foreground transition-colors">
                          <SelectValue placeholder={t("dashboard.stats.unsigned")}>
                            {c.assigned_to_user?.name || t("dashboard.stats.unsigned")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                          <SelectItem value="unassigned">{t("dashboard.stats.unsigned")}</SelectItem>
                          {(Array.isArray(workers) ? workers : [])?.map((w: any) => (
                            <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Link href={`/dashboard/candidates/${c.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary">
                        <EyeIcon className="w-4 h-4 mr-2" />
                        {t("candidates.list.actions.view")}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 6} className="h-24 text-center text-muted-foreground">
                  {t("candidates.list.no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div >

      {/* Modern Pagination Controls */}
      < div className="flex items-center justify-between px-2 py-4 border-t border-slate-100" >
        <div className="text-sm text-muted-foreground">
          {t("candidates.list.pagination_summary")
            ? t("candidates.list.pagination_summary")
              .replace("{total}", pagination.total.toString())
              .replace("{from}", (((page - 1) * pagination.per_page) + 1).toString())
              .replace("{to}", Math.min(page * pagination.per_page, pagination.total).toString())
            : `Showing ${((page - 1) * pagination.per_page) + 1} to ${Math.min(page * pagination.per_page, pagination.total)} of ${pagination.total} results`
          }
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center text-xs font-medium text-muted-foreground">
            {t("candidates.list.pagination")
              .replace("{page}", pagination.current_page.toString())
              .replace("{total}", pagination.last_page.toString())}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pagination.last_page || isLoading}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div >

      <EmailEditorDialog
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        recipients={candidates.filter(c => selectedIds.includes(c.id)).map(c => c.email)}
      />
    </div >
  )
}
