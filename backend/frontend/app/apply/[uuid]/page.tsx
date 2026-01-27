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
import { Loader2, CheckCircle2 } from "lucide-react"
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

    const handleInputChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await axios.post(`/api/public/forms/${uuid}/submit`, {
                fields: formData
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

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl">{form.title}</CardTitle>
                        {form.description && <CardDescription className="text-lg mt-2">{form.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {form.fields.map((field: any) => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={field.name}>
                                        {field.label}
                                        {field.validation_rules?.required && <span className="text-destructive ml-1">*</span>}
                                    </Label>

                                    {field.type === 'textarea' ? (
                                        <Textarea
                                            id={field.name}
                                            required={field.validation_rules?.required}
                                            value={formData[field.name] || ""}
                                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                                        />
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
                                    ) : field.type === 'file' ? (
                                        <Input
                                            id={field.name}
                                            type="file"
                                            required={field.validation_rules?.required}
                                            onChange={(e) => handleInputChange(field.name, e.target.files?.[0])}
                                        />
                                    ) : (
                                        <Input
                                            id={field.name}
                                            type={field.type}
                                            required={field.validation_rules?.required}
                                            value={formData[field.name] || ""}
                                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                                            maxLength={field.validation_rules?.max}
                                            min={field.validation_rules?.min}
                                        />
                                    )}
                                </div>
                            ))}

                            <Button type="submit" className="w-full h-12 text-lg" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Application'
                                )}
                            </Button>

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
