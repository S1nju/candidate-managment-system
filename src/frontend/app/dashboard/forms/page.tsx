"use client"
import React from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Link as LinkIcon, Eye, QrCode, Download, Copy } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { QRCodeSVG } from "qrcode.react"
import { useToast } from "@/hooks/use-toast"
import formsApi from "@/services/api/forms.api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

export default function FormsPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const { data: forms, error, isLoading, mutate } = useSWR("/api/forms", () => axios.get("/api/forms").then(res => res.data))

    const [selectedForm, setSelectedForm] = React.useState<any>(null)

    const handleDuplicate = async (id: number) => {
        try {
            await formsApi.duplicateForm(id)
            await mutate()
            toast({ title: t("forms.duplicated") })
        } catch {
            toast({ title: t("forms.duplicate_failed"), variant: "destructive" })
        }
    }

    const copyToClipboard = (uuid: string) => {
        const url = `${window.location.origin}/apply/${uuid}`
        navigator.clipboard.writeText(url)
        alert(t("forms.link_copied"))
    }

    const downloadQRCode = () => {
        const svg = document.getElementById("qr-code-svg")
        if (!svg) return

        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const img = new Image()

        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)
            const pngFile = canvas.toDataURL("image/jpeg", 0.92)
            const downloadLink = document.createElement("a")
            downloadLink.download = `form-qr-${selectedForm?.title || "code"}.png`
            downloadLink.href = pngFile
            downloadLink.click()
        }

        img.src = "data:image/svg+xml;base64," + btoa(svgData)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("forms.title")}</h1>
                    <p className="text-muted-foreground text-sm">{t("forms.subtitle")}</p>
                </div>
                <Link href="/dashboard/forms/new">
                    <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t("forms.new")}
                    </Button>
                </Link>
            </div>

            {isLoading && <div className="text-center py-10">{t("common.loading")}</div>}
            {error && <div className="text-red-500 text-center py-10">{t("common.error")}</div>}

            {!isLoading && !error && forms && forms.length > 0 && (
                <div className="bg-card rounded shadow-sm border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("forms.table.title")}</TableHead>
                                <TableHead>{t("forms.table.status")}</TableHead>
                                <TableHead>{t("forms.table.kyc")}</TableHead>
                                <TableHead>{t("forms.table.created_at")}</TableHead>
                                <TableHead className="text-right">{t("forms.table.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {forms.map((form: any) => (
                                <TableRow key={form.id}>
                                    <TableCell className="font-medium p-0">
                                        <Link
                                            href={`/dashboard/forms/${form.id}/edit`}
                                            className="flex items-start gap-2 p-2 hover:bg-muted/50 transition-colors"
                                        >
                                            <span
                                                className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: form.color || "#3b82f6" }}
                                            />
                                            <div>
                                                {form.title}
                                                <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{form.description}</div>
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={form.status === "active" ? "default" : form.status === "draft" ? "secondary" : "destructive"}>
                                            {t(`forms.status_${form.status.toLowerCase()}`)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={form.kyc_enabled ? "outline" : "secondary"}>
                                            {form.kyc_enabled ? t("forms.enabled") : t("forms.disabled")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {format(new Date(form.created_at), 'dd-MM-yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title={t("forms.copy_link")}
                                                onClick={() => copyToClipboard(form.uuid)}
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                            </Button>
                                            <Link href={`/apply/${form.uuid}?preview=1`} target="_blank">
                                                <Button variant="ghost" size="icon" title={t("forms.view_public")}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/dashboard/forms/${form.id}/edit`}>
                                                <Button variant="ghost" size="icon" title={t("common.edit")}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title={t("forms.duplicate")}
                                                onClick={() => handleDuplicate(form.id)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title={t("forms.qr_code")}
                                                onClick={() => setSelectedForm(form)}
                                                className="text-primary hover:text-primary hover:bg-primary/10"
                                            >
                                                <QrCode className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!isLoading && forms && forms.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed rounded mt-4 dark:border-slate-800">
                    <p className="text-muted-foreground mb-4">{t("forms.empty")}</p>
                    <Link href="/dashboard/forms/new">
                        <Button variant="outline">{t("forms.create_first")}</Button>
                    </Link>
                </div>
            )}

            <Dialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedForm?.title}</DialogTitle>
                        <DialogDescription>
                            {t("forms.qr_description")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border my-4">
                        <QRCodeSVG
                            id="qr-code-svg"
                            value={selectedForm ? `${window.location.origin}/apply/${selectedForm.uuid}` : ""}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                        <p className="text-xs text-muted-foreground mt-4 break-all text-center">
                            {selectedForm ? `${window.location.origin}/apply/${selectedForm.uuid}` : ""}
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button onClick={downloadQRCode} className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            {t("common.download")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
