"use client"

import { useState } from "react"
import { useSWRConfig } from "swr"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, UploadIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function UploadDialog() {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [title, setTitle] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { mutate } = useSWRConfig()
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setIsLoading(true)

        const formData = new FormData()
        formData.append("file", file)
        formData.append("title", title || file.name)

        try {
            await axios.post("/api/documents", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })

            toast({
                title: "Success",
                description: "Document uploaded successfully",
            })

            setOpen(false)
            setFile(null)
            setTitle("")
            mutate("/api/documents")
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to upload document",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Upload Document
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Upload a PDF file to your secure storage.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title (Optional)</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Contract Name"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="file">File</Label>
                            <Input
                                id="file"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading || !file}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
