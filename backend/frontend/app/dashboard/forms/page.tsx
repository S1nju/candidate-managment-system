"use client"
import React from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Link as LinkIcon, Eye } from "lucide-react"

export default function FormsPage() {
    const { data: forms, error, isLoading } = useSWR("/api/forms", () => axios.get("/api/forms").then(res => res.data))

    const copyToClipboard = (uuid: string) => {
        const url = `${window.location.origin}/apply/${uuid}`
        navigator.clipboard.writeText(url)
        alert("Public link copied to clipboard!")
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dynamic Forms</h1>
                    <p className="text-muted-foreground text-sm">Create and manage custom application forms for candidates.</p>
                </div>
                <Link href="/dashboard/forms/new">
                    <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        New Form
                    </Button>
                </Link>
            </div>

            {isLoading && <div className="text-center py-10">Loading forms...</div>}
            {error && <div className="text-red-500 text-center py-10">Failed to load forms</div>}

            {!isLoading && !error && forms && forms.length > 0 && (
                <div className="bg-white rounded shadow-sm border">
                    <Table>
                        <TableCaption>A list of your dynamic forms.</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>KYC</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {forms.map((form: any) => (
                                <TableRow key={form.id}>
                                    <TableCell className="font-medium">
                                        <div>
                                            {form.title}
                                            <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{form.description}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={form.status === "active" ? "default" : form.status === "draft" ? "secondary" : "destructive"}>
                                            {form.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={form.kyc_enabled ? "outline" : "secondary"}>
                                            {form.kyc_enabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {new Date(form.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Copy Link"
                                                onClick={() => copyToClipboard(form.uuid)}
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                            </Button>
                                            <Link href={`/apply/${form.uuid}`} target="_blank">
                                                <Button variant="ghost" size="icon" title="View Public Form">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/forms/${form.id}/edit`}>
                                                <Button variant="ghost" size="icon" title="Edit">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!isLoading && forms && forms.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed rounded mt-4">
                    <p className="text-muted-foreground mb-4">You haven't created any forms yet.</p>
                    <Link href="/dashboard/forms/new">
                        <Button variant="outline">Create your first form</Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
