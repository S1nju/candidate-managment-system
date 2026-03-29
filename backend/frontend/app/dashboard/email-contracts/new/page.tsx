"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormBuilder, FormField } from "@/components/forms/form-builder"
import { ContractLayoutEditor } from "@/components/forms/contract-layout-editor"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2, Upload, FileText, Mail, Settings } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PlaceholderMapping {
    placeholder: string
    source: 'form_field' | 'candidate_data' | 'didit_data' | 'system' | 'static_signature'
    field_name: string
    field_type?: 'text' | 'image' | 'date' | 'file'
    value?: string
    position?: {
        x: number
        y: number
        width?: number
        height?: number
        page: number
    }
}

export default function NewEmailContractPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("basic")

    // Basic Info
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")

    // Form Fields
    const [fields, setFields] = useState<FormField[]>([])

    // Mail Configuration
    const [mailSubject, setMailSubject] = useState("Please sign the contract")
    const [mailBody, setMailBody] = useState("Please review and sign the attached contract.")
    const [mailFrom, setMailFrom] = useState("noreply@signmehere.cloud")
    const [sendCopyToAdmin, setSendCopyToAdmin] = useState(true)

    // PDF & Mapping
    const [templatePath, setTemplatePath] = useState("")
    const [filePreviewUrl, setFilePreviewUrl] = useState("")
    const [mappings, setMappings] = useState<PlaceholderMapping[]>([])
    const [showLayoutEditor, setShowLayoutEditor] = useState(false)
    const [uploading, setUploading] = useState(false)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.pdf')) {
            toast({ title: "Invalid file", description: "Please upload a PDF file", variant: "destructive" })
            return
        }

        const formData = new FormData()
        formData.append('file', file)

        setUploading(true)
        try {
            const res = await axios.post('/api/email-contracts/upload-template', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setTemplatePath(res.data.path)
            setFilePreviewUrl(res.data.url)
            toast({ title: "Template uploaded successfully" })
        } catch (error: any) {
            toast({
                title: "Upload failed",
                description: error.response?.data?.message || "Failed to upload template",
                variant: "destructive"
            })
        } finally {
            setUploading(false)
        }
    }

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
        if (!templatePath) {
            toast({ title: "PDF template is required", variant: "destructive" })
            return
        }
        if (mappings.length === 0) {
            toast({ title: "At least one field mapping is required", variant: "destructive" })
            return
        }
        if (!mailSubject || !mailBody) {
            toast({ title: "Email subject and body are required", variant: "destructive" })
            return
        }

        setLoading(true)
        try {
            await axios.post("/api/email-contracts", {
                title,
                description,
                fields,
                template_path: templatePath,
                placeholders: mappings,
                mail_config: {
                    subject: mailSubject,
                    body: mailBody,
                    from: mailFrom,
                    send_copy_to_admin: sendCopyToAdmin
                }
            })
            toast({ title: "Email contract created successfully" })
            router.push("/dashboard/email-contracts")
        } catch (error: any) {
            toast({
                title: "Failed to create email contract",
                description: error.response?.data?.message || "Something went wrong",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <Link href="/dashboard/email-contracts" className="flex items-center text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
            </Link>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Create Email Contract</h1>
                    <p className="text-muted-foreground">Create a form, configure mail settings, and set up PDF signing</p>
                </div>
                <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t("common.save")}
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="form">Form Fields</TabsTrigger>
                        <TabsTrigger value="template">PDF Template</TabsTrigger>
                        <TabsTrigger value="mail">Mail Config</TabsTrigger>
                    </TabsList>

                    {/* Basic Info Tab */}
                    <TabsContent value="basic" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Email Contract Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Contract Title *</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., Employment Agreement"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe this email contract template..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Form Fields Tab */}
                    <TabsContent value="form" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Form Fields</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Create the form the candidate will fill out before signing
                                </p>
                            </CardHeader>
                            <CardContent>
                                <FormBuilder
                                    initialFields={fields}
                                    onChange={setFields}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PDF Template Tab */}
                    <TabsContent value="template" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>PDF Template</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Upload the PDF contract template and map form fields to signature areas
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!templatePath ? (
                                    <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                                        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                                        <div>
                                            <Label htmlFor="pdf-upload" className="cursor-pointer">
                                                <span className="text-base font-semibold text-primary hover:underline">
                                                    Upload PDF
                                                </span>
                                            </Label>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                or drag and drop a PDF file here
                                            </p>
                                        </div>
                                        <Input
                                            id="pdf-upload"
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                        {uploading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-6 w-6" />
                                                <span className="font-medium">{templatePath.split('/').pop()}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setTemplatePath("")
                                                    setFilePreviewUrl("")
                                                    setMappings([])
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() => setShowLayoutEditor(true)}
                                            className="w-full"
                                        >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Edit Field Mappings
                                        </Button>

                                        {mappings.length > 0 && (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-sm text-green-900">
                                                    ✓ {mappings.length} field mapping(s) configured
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Mail Config Tab */}
                    <TabsContent value="mail" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Email Configuration</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Configure the email template sent to candidates
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mail-from">From Email Address</Label>
                                    <Input
                                        id="mail-from"
                                        type="email"
                                        value={mailFrom}
                                        onChange={(e) => setMailFrom(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mail-subject">Email Subject *</Label>
                                    <Input
                                        id="mail-subject"
                                        placeholder="e.g., Please sign the employment agreement"
                                        value={mailSubject}
                                        onChange={(e) => setMailSubject(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mail-body">Email Body *</Label>
                                    <Textarea
                                        id="mail-body"
                                        placeholder="Dear [candidate_name],&#10;&#10;Please review the contract and sign below.&#10;&#10;Best regards,&#10;[your_company]"
                                        value={mailBody}
                                        onChange={(e) => setMailBody(e.target.value)}
                                        rows={8}
                                        className="bg-background font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        You can use placeholders like {`[candidate_name]`}, {`[candidate_email]`}, {`[sign_link]`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="send-copy"
                                        checked={sendCopyToAdmin}
                                        onChange={(e) => setSendCopyToAdmin(e.target.checked)}
                                        className="rounded"
                                    />
                                    <Label htmlFor="send-copy" className="cursor-pointer">
                                        Send a copy of the signed contract to admin
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </form>

            {/* Layout Editor Modal */}
            {showLayoutEditor && filePreviewUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto w-full mx-4">
                        <ContractLayoutEditor
                            fileUrl={filePreviewUrl}
                            mappings={mappings}
                            formFields={fields}
                            onSave={(updatedMappings) => {
                                setMappings(updatedMappings)
                                setShowLayoutEditor(false)
                            }}
                            onClose={() => setShowLayoutEditor(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
