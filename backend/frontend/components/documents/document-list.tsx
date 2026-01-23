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
    FileTextIcon,
    DownloadIcon,
    EyeIcon,
    PenToolIcon,
    Search,
    Filter
} from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { AssignDialog } from "./assign-dialog"

interface Document {
    id: number
    title: string
    status: string
    created_at: string
    assigned_by?: { name: string }
    assigned_to?: { name: string }
    uploader?: { name: string }
}

export function DocumentList() {
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("all")
    const [page, setPage] = useState(1)
    const [tab, setTab] = useState("assigned")
    const { user } = useAuth({ middleware: "auth" })
    const isAdmin = user?.roles?.some((r: any) => r.name === 'admin')
    const pageSize = 15
    const [assignOpen, setAssignOpen] = useState(false)
    const [assignDocId, setAssignDocId] = useState<number | null>(null)

    const queryParams = new URLSearchParams()
    if (search) queryParams.append("search", search)
    if (status !== "all") queryParams.append("status", status)
    queryParams.append("page", String(page))
    queryParams.append("per_page", String(pageSize))
    queryParams.append("order", "desc")
    if (!isAdmin) {
        queryParams.append("tab", tab) // 'assigned' or 'uploaded'
    }

    const { data: response, error, isLoading } = useSWR(
        `/api/documents?${queryParams.toString()}`,
        () => axios.get(`/api/documents?${queryParams.toString()}`).then((res) => res.data)
    )
    const documents = response?.data as Document[] | undefined;
    const total = response?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const handleView = (id: number) => {
        const baseUrl = axios.defaults.baseURL?.toString().replace(/\/$/, '')
        const url = `${baseUrl}/api/documents/${id}/preview`
        window.location.href = url;
    }

    const handleDownload = (id: number) => {
        handleView(id);
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "signed":
                return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            case "sent":
                return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            case "rejected":
                return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40"
            case "draft":
            default:
                return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80"
        }
    }

    // Replace handleAssign to open modal
    const openAssignDialog = (docId: number) => {
        setAssignDocId(docId)
        setAssignOpen(true)
    }

    if (error) {
        return <div className="text-red-500 p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-900/30 font-medium">Failed to load documents. Please try again.</div>
    }

    return (
        <div className="space-y-4">
            <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} documentId={assignDocId} onAssigned={() => window.location.reload()} />
            {/* Tabs for platform workers */}
            {!isAdmin && (
                <Tabs value={tab} onValueChange={setTab} className="mb-4">
                    <TabsList>
                        <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
                        <TabsTrigger value="uploaded">Uploaded by Me</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between pb-2">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 bg-card"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[180px] h-10 bg-card">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent className="bg-card">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="signed">Signed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl border shadow-sm overflow-hidden bg-card border-slate-200 dark:border-slate-800">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Title</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Status</TableHead>
                            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Created At</TableHead>
                            {tab === "assigned" && !isAdmin && <TableHead>Assigned By</TableHead>}
                            <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-100">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} className="border-slate-200 dark:border-slate-800">
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    {tab === "assigned" && !isAdmin && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
                                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : documents && documents.length > 0 && (
                            documents.map((doc) => (
                                <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${doc.status === 'signed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-muted text-slate-600 dark:text-slate-400'}`}>
                                                <FileTextIcon className="w-4 h-4" />
                                            </div>
                                            <span className="text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">{doc.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`capitalize px-2 py-0.5 font-medium border shadow-none ${getStatusColor(doc.status)}`}>
                                            {doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 dark:text-slate-100/50 text-sm">
                                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    {tab === "assigned" && !isAdmin && <TableCell>{doc.assigned_by?.name || "-"}</TableCell>}
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {isAdmin && doc.status !== "signed" && (
                                                <Button variant="outline" size="sm" onClick={() => openAssignDialog(doc.id)}>Assign</Button>
                                            )}
                                            {doc.status !== "signed" ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-primary hover:text-primary hover:bg-primary/10 dark:text-primary dark:hover:bg-primary/20"
                                                    onClick={() => window.location.href = `/dashboard/documents/${doc.id}/sign`}
                                                >
                                                    <PenToolIcon className="w-4 h-4 mr-2" />
                                                    Sign
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-slate-400 hover:text-primary dark:hover:text-primary"
                                                        onClick={() => handleView(doc.id)}
                                                        title="View PDF"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-slate-400 hover:text-primary dark:hover:text-primary"
                                                        onClick={() => handleDownload(doc.id)}
                                                        title="Download PDF"
                                                    >
                                                        <DownloadIcon className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-end gap-2 mt-2">
                    <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <span>Page {page} of {totalPages}</span>
                    <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
            )}
        </div>
    )
}
