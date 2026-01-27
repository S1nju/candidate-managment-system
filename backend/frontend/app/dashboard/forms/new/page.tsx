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
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NewFormPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState("draft")
    const [kycEnabled, setKycEnabled] = useState(false)
    const [fields, setFields] = useState<FormField[]>([])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title) {
            toast({ title: "Title is required", variant: "destructive" })
            return
        }
        if (fields.length === 0) {
            toast({ title: "At least one field is required", variant: "destructive" })
            return
        }

        setLoading(true)
        try {
            await axios.post("/api/forms", {
                title,
                description,
                status,
                kyc_enabled: kycEnabled,
                fields
            })
            toast({ title: "Form created successfully" })
            router.push("/dashboard/forms")
        } catch (error: any) {
            toast({
                title: "Failed to create form",
                description: error.response?.data?.message || "Something went wrong",
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
                Back to Forms
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Create New Form</h1>
                <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Form
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow-sm border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Form Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Developer Application 2024"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Briefly describe the purpose of this form..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-6 flex flex-col justify-between">
                        <div className="space-y-2">
                            <Label htmlFor="status">Initial Status</Label>
                            <Select value={status} onValueChange={(val) => setStatus(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="active">Active (Visible to public)</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-md border">
                            <div className="space-y-0.5">
                                <Label className="text-base">Require Identity Verification (KYC)</Label>
                                <p className="text-sm text-muted-foreground">Candidates must complete DIDIT KYC before submitting.</p>
                            </div>
                            <Switch checked={kycEnabled} onCheckedChange={setKycEnabled} />
                        </div>
                    </div>
                </div>

                <hr />

                <FormBuilder onChange={setFields} />
            </form>
        </div>
    )
}
