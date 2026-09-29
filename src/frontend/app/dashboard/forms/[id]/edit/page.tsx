"use client"
import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import useSWR from "swr"
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
import { ArrowLeft, Save, Loader2, Trash2, FileText, Layout, Eye } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormContractManager } from "@/components/forms/form-contract-manager"
import { useLanguage } from "@/context/language-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function EditFormPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { id } = useParams()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState("draft")
    const [kycEnabled, setKycEnabled] = useState(false)
    const [color, setColor] = useState("#3b82f6")
    const [fields, setFields] = useState<FormField[]>([])
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const { data: roles } = useSWR('/api/admin/roles', url => axios.get(url).then(res => res.data).catch(() => []))
    const [uuid, setUuid] = useState("")
    const [roleId, setRoleId] = useState<string>("")

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const res = await axios.get(`/api/forms/${id}`)
                const form = res.data
                setTitle(form.title)
                setUuid(form.uuid || "")
                setDescription(form.description || "")
                setStatus(form.status)
                setColor(form.color || "#3b82f6")
                setKycEnabled(form.kyc_enabled)
                setFields(form.fields || [])
                setRoleId(form.role_id ? String(form.role_id) : "")
            } catch (error) {
                toast({ title: t("forms.load_failed"), variant: "destructive" })
                router.push("/dashboard/forms")
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchForm()
    }, [id, router, toast])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title) {
            toast({ title: t("forms.title_required"), variant: "destructive" })
            return
        }

        setSaving(true)
        try {
            await axios.put(`/api/forms/${id}`, {
                title,
                description,
                status,
                color,
                kyc_enabled: kycEnabled,
                role_id: (roleId && roleId !== "0") ? roleId : null,
                fields
            })
            toast({ title: t("forms.update_success") })
            router.push("/dashboard/forms")
        } catch (error: any) {
            toast({
                title: t("forms.update_failed"),
                description: error.response?.data?.message || t("common.error"),
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await axios.delete(`/api/forms/${id}`)
            toast({ title: t("forms.delete_success") })
            router.push("/dashboard/forms")
        } catch (error) {
            toast({ title: t("forms.delete_failed"), variant: "destructive" })
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/dashboard/forms" className="flex items-center text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t("forms.edit")}</h1>
                <div className="flex gap-2">
                    {uuid && (
                        <Button variant="outline" asChild>
                            <Link href={`/apply/${uuid}?preview=1`} target="_blank" className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                {t("forms.preview")}
                            </Link>
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="text-destructive border-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("common.delete")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t("forms.save_changes")}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="fields" className="space-y-6">
                <TabsList className="bg-muted/50 border w-full justify-start h-12 p-1">
                    <TabsTrigger value="fields" className="h-full px-6 flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        {t("forms.fields_tab")}
                    </TabsTrigger>
                    <TabsTrigger value="contracts" className="h-full px-6 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t("forms.contracts_tab")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="fields" className="space-y-6">
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
                        {roles && roles.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="role">{t("forms.assign_role_label")}</Label>
                                <Select value={roleId} onValueChange={setRoleId}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder={t("forms.assign_role_placeholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">{t("forms.assign_role_none")}</SelectItem>
                                        {roles.map((role: any) => (
                                            <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{t("forms.assign_role_desc")}</p>
                            </div>
                        )}
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

                        <FormBuilder initialFields={fields} onChange={setFields} />
                    </form>
                </TabsContent>

                <TabsContent value="contracts" className="bg-card p-8 rounded-lg shadow-sm border">
                    <FormContractManager formId={id as string} fields={fields} />
                </TabsContent>
            </Tabs>

            <Dialog open={showDeleteConfirm} onOpenChange={(open) => !deleting && setShowDeleteConfirm(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("forms.delete_confirm_title")}</DialogTitle>
                        <DialogDescription>{t("forms.delete_confirm_desc")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {t("common.delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
