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
import { useLanguage } from "@/context/language-context"

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
    initialSubject,
    initialBody
}: EmailEditorDialogProps) {
    const { t } = useLanguage()
    const [subject, setSubject] = useState(initialSubject ?? t("candidates.email_editor.default_subject"))
    const [body, setBody] = useState(initialBody ?? t("candidates.email_editor.default_body"))

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
                    <DialogTitle>{t("candidates.email_editor.title")}</DialogTitle>
                    <DialogDescription>
                        {t("candidates.email_editor.description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="recipients">{t("candidates.email_editor.recipients_label")}</Label>
                        <Input
                            id="recipients"
                            value={recipients.join(", ")}
                            readOnly
                            className="bg-muted text-muted-foreground text-xs"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="subject">{t("candidates.email_editor.subject_label")}</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={t("candidates.email_editor.subject_placeholder")}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="body">{t("candidates.email_editor.body_label")}</Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={t("candidates.email_editor.body_placeholder")}
                            rows={10}
                            className="resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t("candidates.email_editor.cancel")}</Button>
                    <Button onClick={handleSend} className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        {t("candidates.email_editor.send_button")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
