"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormBuilder, FormField } from "@/components/forms/form-builder"
import { ColorPicker } from "@/components/forms/color-picker"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"

export default function NewFormPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState("draft")
    const [kycEnabled, setKycEnabled] = useState(false)
    const [color, setColor] = useState("#3b82f6")
    const [fields, setFields] = useState<FormField[]>([])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title) {
            toast({ title: t("forms.title_required"), variant: "destructive" })
            return
        }
        if (fields.length === 0) {
            toast({ title: t("forms.fields_required"), variant: "destructive" })
            return
        }

        setLoading(true)
        try {
            await axios.post("/api/forms", {
                title,
                description,
                status,
                color,
                kyc_enabled: kycEnabled,
                fields
            })
            toast({ title: t("forms.create_success") })
            router.push("/dashboard/forms")
        } catch (error: any) {
            toast({
                title: t("forms.create_failed"),
                description: error.response?.data?.message || t("common.error"),
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/dashboard/forms" className="flex items-center text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t("forms.new")}</h1>
                <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t("forms.save_form")}
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 bg-card p-8 rounded-lg shadow-sm border">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">{t("forms.table.title")}</Label>
                            <Input
                                id="title"
                                placeholder={t("forms.title_placeholder")}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">{t("forms.table.status")}</Label>
                            <Select value={status} onValueChange={(val) => setStatus(val)}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder={t("forms.builder.select_status_placeholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">{t("forms.status_draft")}</SelectItem>
                                    <SelectItem value="active">{t("forms.status_active")}</SelectItem>
                                    <SelectItem value="disabled">{t("forms.status_disabled")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">{t("forms.description_label")}</Label>
                        <Textarea
                            id="description"
                            placeholder={t("forms.description_placeholder")}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-background min-h-[88px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                        <div className="space-y-2">
                            <Label>{t("forms.color")}</Label>
                            <ColorPicker value={color} onChange={setColor} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-md border">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold">{t("forms.kyc_label")}</Label>
                            <p className="text-sm text-muted-foreground">{t("forms.kyc_desc")}</p>
                        </div>
                        <Switch className="shrink-0" checked={kycEnabled} onCheckedChange={setKycEnabled} />
                    </div>
                </div>

                <hr className="dark:border-slate-800" />

                <FormBuilder onChange={setFields} />
            </form>
        </div>
    )
}
