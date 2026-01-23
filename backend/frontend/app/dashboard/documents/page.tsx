"use client"

import { DocumentList } from "@/components/documents/document-list"
import { UploadDialog } from "@/components/documents/upload-dialog"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DocumentsPage() {
    useAuth({ middleware: "auth" })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                    <p className="text-muted-foreground">
                        Manage your contracts and signed documents here.
                    </p>
                </div>
                <div className="flex gap-2">
                    <UploadDialog />
                    <Link href="/dashboard/signatures">
                        <Button variant="outline">My Signatures</Button>
                    </Link>
                </div>
            </div>
            <DocumentList />
        </div>
    )
}
