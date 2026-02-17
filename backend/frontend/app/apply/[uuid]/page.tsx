"use client"
import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, CheckCircle2, FileText, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function PublicFormPage() {
    const { uuid } = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const [form, setForm] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [submitted, setSubmitted] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const res = await axios.get(`/api/public/forms/${uuid}`)
                setForm(res.data)
                // Initialize form data
                const initial: Record<string, any> = {}
                res.data.fields.forEach((f: any) => {
                    initial[f.name] = ""
                })
                setFormData(initial)
            } catch (error) {
                console.error("Failed to load form", error)
            } finally {
                setLoading(false)
            }
        }
        fetchForm()
    }, [uuid])

    const pages = form ? Array.from(new Set(form.fields.map((f: any) => f.page || 1))).sort((a: any, b: any) => a - b) : []
    const isLastPage = currentPage === (pages.length > 0 ? Math.max(...pages as number[]) : 1)
    const isFirstPage = currentPage === 1

    const handleInputChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const checkConditions = (field: any) => {
        if (!field.conditions || field.conditions.length === 0) return true

        return field.conditions.every((cond: any) => {
            const fieldValue = formData[cond.field]
            if (cond.operator === 'equals') {
                return fieldValue == cond.value
            } else if (cond.operator === 'not_equals') {
                return fieldValue != cond.value
            }
            return true
        })
    }

    const validateCurrentPage = () => {
        const pageFields = form.fields.filter((f: any) => (f.page || 1) === currentPage)
        for (const field of pageFields) {
            // Skip validation if field is hidden by conditions
            if (!checkConditions(field)) continue;

            if (field.validation_rules?.required && !formData[field.name]) {
                toast({
                    title: `Missing field: ${field.label}`,
                    description: "Please complete all mandatory fields to continue.",
                    variant: "destructive"
                })
                return false
            }
        }
        return true
    }

    const handleNext = () => {
        if (validateCurrentPage()) {
            const nextPageIndex = (pages as number[]).indexOf(currentPage) + 1
            if (nextPageIndex < pages.length) {
                setCurrentPage(pages[nextPageIndex] as number)
                window.scrollTo(0, 0)
            }
        }
    }

    const handlePrevious = () => {
        const prevPageIndex = (pages as number[]).indexOf(currentPage) - 1
        if (prevPageIndex >= 0) {
            setCurrentPage(pages[prevPageIndex] as number)
            window.scrollTo(0, 0)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateCurrentPage()) return

        setSubmitting(true)
        try {
            const data = new FormData()
            Object.entries(formData).forEach(([key, value]) => {
                if (value instanceof File) {
                    data.append(`fields[${key}]`, value)
                } else {
                    data.append(`fields[${key}]`, value)
                }
            })

            const res = await axios.post(`/api/public/forms/${uuid}/submit`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            if (res.data.kyc_required) {
                toast({ title: "Form submitted!", description: "Redirecting to identity verification..." })
                window.location.href = res.data.kyc_redirect_url
            } else {
                setSubmitted(true)
            }
        } catch (error: any) {
            toast({
                title: "Submission failed",
                description: error.response?.data?.message || "Please check your inputs",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    if (!form) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Form Not Found</h1>
                    <p className="text-muted-foreground">This form may have been disabled or deleted.</p>
                </div>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-10 pb-10">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                        <p className="text-muted-foreground">Your application has been submitted successfully. We will be in touch soon.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }


    const currentPageFields = form.fields
        .filter((f: any) => (f.page || 1) === currentPage)
        .filter((f: any) => checkConditions(f))

    const currentPageTitle = currentPageFields[0]?.page_title || "Information"
    const totalPagesCount = pages.length;
    const progress = (pages.indexOf(currentPage) + 1) / totalPagesCount * 100;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-4">
                {/* Progress Bar */}
                {totalPagesCount > 1 && (
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-blue-600 h-full transition-all duration-500 ease-in-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl">{form.title}</CardTitle>
                        {totalPagesCount > 1 && (
                            <p className="text-blue-600 font-semibold text-sm mt-2 uppercase tracking-wider">
                                Step {(pages.indexOf(currentPage) + 1)} of {totalPagesCount}: {currentPageTitle}
                            </p>
                        )}
                        {form.description && currentPage === 1 && (
                            <CardDescription className="text-lg mt-2">{form.description}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {currentPageFields.map((field: any) => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={field.name}>
                                        {field.label}
                                        {field.validation_rules?.required && <span className="text-destructive ml-1">*</span>}
                                    </Label>

                                    {field.type === 'textarea' ? (
                                        <div className="space-y-1">
                                            <Textarea
                                                id={field.name}
                                                required={field.validation_rules?.required}
                                                value={formData[field.name] || ""}
                                                onChange={(e) => {
                                                    const value = e.target.value
                                                    if (!field.validation_rules?.max || value.length <= field.validation_rules.max) {
                                                        handleInputChange(field.name, value)
                                                    }
                                                }}
                                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                maxLength={field.validation_rules?.max}
                                            />
                                            {field.validation_rules?.max && (
                                                <p className="text-xs text-muted-foreground text-right">
                                                    {(formData[field.name] || "").length} / {field.validation_rules.max}
                                                </p>
                                            )}
                                        </div>
                                    ) : field.type === 'select' ? (
                                        <Select
                                            value={formData[field.name] || ""}
                                            onValueChange={(val) => handleInputChange(field.name, val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {field.validation_rules?.options?.map((opt: string) => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : field.type === 'radio' ? (
                                        <RadioGroup
                                            value={formData[field.name] || ""}
                                            onValueChange={(val) => handleInputChange(field.name, val)}
                                            className="flex flex-col gap-2 pt-2"
                                        >
                                            {field.validation_rules?.options?.map((opt: string) => (
                                                <div key={opt} className="flex items-center space-x-2">
                                                    <RadioGroupItem value={opt} id={`${field.name}-${opt}`} />
                                                    <Label htmlFor={`${field.name}-${opt}`} className="font-normal">{opt}</Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    ) : (field.type === 'file') ? (
                                        <div className="space-y-3">
                                            <Input
                                                id={field.name}
                                                type="file"
                                                required={field.validation_rules?.required}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        handleInputChange(field.name, file)
                                                    }
                                                }}
                                                className="cursor-pointer"
                                                accept={field.validation_rules?.accept || (field.name.includes('photo') || field.name.includes('image') ? 'image/*' : '.pdf,.doc,.docx')}
                                            />
                                            {formData[field.name] instanceof File && (
                                                <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                                                    {formData[field.name].type.startsWith('image/') ? (
                                                        <div className="h-16 w-16 rounded overflow-hidden border bg-white flex-shrink-0">
                                                            <img
                                                                src={URL.createObjectURL(formData[field.name])}
                                                                alt="Preview"
                                                                className="h-full w-full object-cover"
                                                                onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-16 w-16 rounded border bg-white flex items-center justify-center flex-shrink-0">
                                                            <FileText className="h-8 w-8 text-blue-500" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 text-sm">
                                                        <p className="font-medium truncate">{formData[field.name].name}</p>
                                                        <p className="text-muted-foreground">{(formData[field.name].size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => handleInputChange(field.name, null)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) :
                                        (field.type === 'image') ? (
                                            <div className="space-y-3">
                                                <Input
                                                    id={field.name}
                                                    type="file"
                                                    accept="image/*"
                                                    required={field.validation_rules?.required}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) {
                                                            handleInputChange(field.name, file)
                                                        }
                                                    }}
                                                    className="cursor-pointer"

                                                />
                                                {formData[field.name] instanceof File && (
                                                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                                                        {formData[field.name].type.startsWith('image/') ? (
                                                            <div className="h-16 w-16 rounded overflow-hidden border bg-white flex-shrink-0">
                                                                <img
                                                                    src={URL.createObjectURL(formData[field.name])}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="h-16 w-16 rounded border bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                                <FileText className="h-8 w-8 text-blue-500" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0 text-sm">
                                                            <p className="font-medium truncate">{formData[field.name].name}</p>
                                                            <p className="text-muted-foreground">{(formData[field.name].size / 1024).toFixed(1)} KB</p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() => handleInputChange(field.name, null)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ) :
                                            (
                                                <div className="space-y-1">
                                                    <Input
                                                        id={field.name}
                                                        type={field.type}
                                                        required={field.validation_rules?.required}
                                                        value={formData[field.name] || ""}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            if (field.type === 'text' && field.validation_rules?.max && value.length > field.validation_rules.max) {
                                                                return
                                                            }
                                                            handleInputChange(field.name, value)
                                                        }}
                                                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                        maxLength={field.validation_rules?.max}
                                                        min={field.validation_rules?.min}
                                                    />
                                                    {field.type === 'text' && field.validation_rules?.max && (
                                                        <p className="text-xs text-muted-foreground text-right">
                                                            {(formData[field.name] || "").length} / {field.validation_rules.max}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                </div>
                            ))}

                            <div className="flex gap-4 pt-4">
                                {!isFirstPage && (
                                    <Button type="button" variant="outline" className="flex-1 h-12 text-lg" onClick={handlePrevious}>
                                        Previous
                                    </Button>
                                )}

                                {isLastPage ? (
                                    <Button type="submit" className="flex-1 h-12 text-lg bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            'Submit Application'
                                        )}
                                    </Button>
                                ) : (
                                    <Button type="button" className="flex-1 h-12 text-lg bg-blue-600 hover:bg-blue-700" onClick={handleNext}>
                                        Next
                                    </Button>
                                )}
                            </div>

                            <p className="text-center text-xs text-muted-foreground mt-4">
                                Securely powered by Candidate Management System
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

