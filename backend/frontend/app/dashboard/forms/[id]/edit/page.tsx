"use client"
import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormBuilder, FormField } from "@/components/forms/form-builder"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2, Trash2, FileText, Layout } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormContractManager } from "@/components/forms/form-contract-manager"
import { useLanguage } from "@/context/language-context"

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
    const [fields, setFields] = useState<FormField[]>([])

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const res = await axios.get(`/api/forms/${id}`)
                const form = res.data
                setTitle(form.title)
                setDescription(form.description || "")
                setStatus(form.status)
                setKycEnabled(form.kyc_enabled)
                setFields(form.fields || [])
            } catch (error) {
                toast({ title: "Failed to load form", variant: "destructive" })
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
            toast({ title: "Title is required", variant: "destructive" })
            return
        }

        setSaving(true)
        try {
            await axios.put(`/api/forms/${id}`, {
                title,
                description,
                status,
                kyc_enabled: kycEnabled,
                fields
            })
            toast({ title: "Form updated successfully" })
            router.push("/dashboard/forms")
        } catch (error: any) {
            toast({
                title: "Failed to update form",
                description: error.response?.data?.message || "Something went wrong",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this form?")) return

        try {
            await axios.delete(`/api/forms/${id}`)
            toast({ title: "Form deleted" })
            router.push("/dashboard/forms")
        } catch (error) {
            toast({ title: "Failed to delete form", variant: "destructive" })
        }
    }

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/dashboard/forms" className="flex items-center text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Forms
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t("forms.edit")}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDelete} className="text-destructive border-destructive hover:bg-destructive/10">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Form Title</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <Label htmlFor="status">Form Status</Label>
                                    <Select value={status} onValueChange={(val) => setStatus(val)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="active">Active (Visible to public)</SelectItem>
                                            <SelectItem value="disabled">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Require Identity Verification (KYC)</Label>
                                        <p className="text-sm text-muted-foreground">Candidates must complete DIDIT KYC before submitting.</p>
                                    </div>
                                    <Switch checked={kycEnabled} onCheckedChange={setKycEnabled} />
                                </div>
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
        </div>
    )
}
