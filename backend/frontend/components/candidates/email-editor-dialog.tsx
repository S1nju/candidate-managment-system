"use client"

import React, { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

interface EmailEditorDialogProps {
    isOpen: boolean
    onClose: () => void
    recipients: string[]
    initialSubject?: string
    initialBody?: string
}

export function EmailEditorDialog({
    isOpen,
    onClose,
    recipients,
    initialSubject = "Regarding your application",
    initialBody = "Hello,\n\nWe are reaching out to you regarding your application..."
}: EmailEditorDialogProps) {
    const [subject, setSubject] = useState(initialSubject)
    const [body, setBody] = useState(initialBody)

    const handleSend = () => {
        const emails = recipients.join(",")
        const encodedSubject = encodeURIComponent(subject)
        const encodedBody = encodeURIComponent(body)

        // Construct mailto link
        // Use bcc if multiple recipients
        const to = recipients.length === 1 ? recipients[0] : ""
        const bcc = recipients.length > 1 ? recipients.join(",") : ""

        let mailtoUrl = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`
        if (bcc) {
            mailtoUrl += `&bcc=${bcc}`
        }

        window.location.href = mailtoUrl
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Compose Email</DialogTitle>
                    <DialogDescription>
                        Customize your message before sending. This will open your default email client.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="recipients">Recipients</Label>
                        <Input
                            id="recipients"
                            value={recipients.join(", ")}
                            readOnly
                            className="bg-muted text-muted-foreground text-xs"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter subject..."
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="body">Message Body</Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Type your message here..."
                            rows={10}
                            className="resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSend} className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Open Email Client
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
