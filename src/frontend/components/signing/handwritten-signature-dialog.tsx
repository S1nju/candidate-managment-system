"use client"

import { useEffect, useRef, useState } from "react"
import { Dancing_Script } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useLanguage } from "@/context/language-context"

const handwriting = Dancing_Script({ subsets: ["latin"], weight: "700" })

interface HandwrittenSignatureDialogProps {
    open: boolean
    mode: "signature" | "initials"
    defaultText?: string
    onOpenChange: (open: boolean) => void
    /** Receives a JPEG data URL of the text rendered in a handwriting font on white. */
    onConfirm: (dataUrl: string) => void
}

function initialsOf(name: string) {
    return name
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(part => part[0])
        .join("")
        .slice(0, 4)
        .toUpperCase()
}

async function renderHandwriting(text: string, mode: "signature" | "initials"): Promise<string> {
    const width = mode === "signature" ? 800 : 400
    const height = 240
    const family = handwriting.style.fontFamily
    try {
        await document.fonts.load(`700 100px ${family}`, text)
    } catch {
        // fall back to the cursive stack below
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = "#111111"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Shrink the text until it fits the canvas width
    let size = 140
    do {
        ctx.font = `700 ${size}px ${family}, cursive`
        size -= 6
    } while (ctx.measureText(text).width > width - 60 && size > 24)
    ctx.fillText(text, width / 2, height / 2)

    return canvas.toDataURL("image/jpeg", 0.92)
}

export function HandwrittenSignatureDialog({ open, mode, defaultText = "", onOpenChange, onConfirm }: HandwrittenSignatureDialogProps) {
    const { t } = useLanguage()
    const [text, setText] = useState("")
    const [busy, setBusy] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setText(mode === "initials" ? initialsOf(defaultText) : defaultText)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open, mode, defaultText])

    const confirm = async () => {
        const value = text.trim()
        if (!value) return
        setBusy(true)
        try {
            onConfirm(await renderHandwriting(value, mode))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t(mode === "initials" ? "public_sign.dialog.initials_title" : "public_sign.dialog.signature_title")}</DialogTitle>
                    <DialogDescription>{t(mode === "initials" ? "public_sign.dialog.initials_desc" : "public_sign.dialog.signature_desc")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="handwritten-text">{t(mode === "initials" ? "public_sign.dialog.initials_label" : "public_sign.dialog.name_label")}</Label>
                        <Input
                            id="handwritten-text"
                            ref={inputRef}
                            value={text}
                            maxLength={mode === "initials" ? 4 : 60}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && confirm()}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">{t("public_sign.dialog.preview")}</Label>
                        <div className="h-28 rounded-lg border bg-white flex items-center justify-center overflow-hidden px-4">
                            <span className={`${handwriting.className} text-black whitespace-nowrap`} style={{ fontSize: mode === "initials" ? 56 : 48 }}>
                                {text}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                    <Button onClick={confirm} disabled={busy || !text.trim()}>{t("public_sign.dialog.validate")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
