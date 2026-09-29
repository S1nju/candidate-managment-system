"use client"

import { getCandidateDisplayName } from "@/lib/candidate-name"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  UserIcon,
  Search,
  Filter,
  EyeIcon,
  Mail,
  Phone,
  Send,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"
import { useAuth } from "@/hooks/use-auth"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/hooks/use-toast"
import { EmailEditorDialog } from "@/components/candidates/email-editor-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

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
  form?: {
    id: number
    title: string
    color?: string
  }
}

export function CandidateList() {
  const { t } = useLanguage()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.roles?.some((r: any) => r.name === 'admin')

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [formId, setFormId] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
    form_id: formId,
    per_page: "15"
  })

  const { data: response, error, isLoading, mutate } = useSWR(`/api/candidates?${queryParams.toString()}`)
  const { data: forms } = useSWR("/api/forms")

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

  const handleDelete = async () => {
    if (!candidateToDelete) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/candidates/${candidateToDelete.id}`)
      toast({ title: t("candidates.list.delete_success") })
      setCandidateToDelete(null)
      mutate()
    } catch (error) {
      toast({ title: t("candidates.list.delete_failed"), variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = (val: string) => {
    setStatus(val)
    setPage(1) // Reset to first page on filter change
  }

  const getStatusColor = (status: string) => {
    if (status === "signed") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
    if (status === "rejected") return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
    if (status === "pending_candidate_signature") return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
    if (status === "pending_admin_signature") return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40"
    return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
  }

  const getStatusLabel = (status: string) => {
    if (status === "signed") return t("candidates.list.signed")
    if (status === "rejected") return t("candidates.list.rejected")
    if (status === "pending_candidate_signature") return t("candidates.list.pending_candidate") || "Waiting for Candidate"
    if (status === "pending_admin_signature") return t("candidates.list.pending_admin") || "Waiting for Admin"
    return t("candidates.list.pending")
  }

  if (error) {
    return <div className="text-red-500 p-4 border rounded-lg bg-red-50 font-medium">{t("common.error")}</div>
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Tabs value={formId} onValueChange={(val) => { setFormId(val); setPage(1); }}>
          <TabsList className="bg-muted/50 border h-auto flex-wrap justify-start">
            <TabsTrigger value="all">{t("candidates.list.all_forms")}</TabsTrigger>
            {forms?.map((f: any) => (
              <TabsTrigger key={f.id} value={f.id.toString()} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: f.color || "#3b82f6" }}
                />
                {f.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

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
              {t("candidates.list.email_selected").replace("{count}", selectedIds.length.toString())}
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
              <SelectItem value="pending_candidate_signature">{t("candidates.list.pending_candidate") || "Waiting for Candidate"}</SelectItem>
              <SelectItem value="pending_admin_signature">{t("candidates.list.pending_admin") || "Waiting for Admin"}</SelectItem>
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
              <TableHead className="font-semibold">{t("candidates.list.table.form")}</TableHead>
              <TableHead className="font-semibold">{t("candidates.list.table.contact")}</TableHead>
              <TableHead className="font-semibold">{t("candidates.list.table.status")}</TableHead>
              <TableHead className="text-right font-semibold">{t("candidates.list.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 15 }).map((_, i) => (
                <TableRow key={i}>
                  {isAdmin && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
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
                  <TableCell className="font-medium p-0">
                    <Link href={`/dashboard/candidates/${c.id}`} className="flex items-center gap-3 p-4 hover:underline">
                      <div className="p-2 rounded-lg bg-muted">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold">{getCandidateDisplayName(c)}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {c.form ? (
                      <Badge
                        variant="outline"
                        className="font-normal"
                        style={{
                          borderColor: c.form.color || "#3b82f6",
                          color: c.form.color || "#3b82f6",
                          backgroundColor: `${c.form.color || "#3b82f6"}1A`,
                        }}
                      >
                        {c.form.title}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">{t("common.all")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm text-muted-foreground">
                      <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</div>
                      {c.phone && <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {c.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`px-2 py-0.5 font-medium ${getStatusColor(c.contract_status || "pending")}`}>
                      {getStatusLabel(c.contract_status || "pending")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/candidates/${c.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary">
                          <EyeIcon className="w-4 h-4 mr-2" />
                          {t("candidates.list.actions.view")}
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-destructive"
                          onClick={() => setCandidateToDelete(c)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  {t("candidates.list.no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modern Pagination Controls */}
      <div className="flex items-center justify-between px-2 py-4 border-t border-slate-100 dark:border-slate-800">
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
      </div>

      <EmailEditorDialog
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        recipients={candidates.filter(c => selectedIds.includes(c.id)).map(c => c.email)}
      />

      <Dialog open={!!candidateToDelete} onOpenChange={(open) => !open && setCandidateToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("candidates.list.delete_confirm_title")}</DialogTitle>
            <DialogDescription>
              {t("candidates.list.delete_confirm_desc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCandidateToDelete(null)} disabled={isDeleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {t("candidates.list.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
