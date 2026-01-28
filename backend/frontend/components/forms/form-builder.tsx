"use client"
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, GripVertical, ChevronDown, ChevronUp, Layout } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

export interface FormField {
    id?: string
    type: string
    label: string
    name: string
    validation_rules: {
        required: boolean
        max?: number
        min?: number
    }
    order: number
    page?: number
    page_title?: string
}

interface FormBuilderProps {
    initialFields?: FormField[]
    onChange: (fields: FormField[]) => void
}

export function FormBuilder({ initialFields = [], onChange }: FormBuilderProps) {
    const [fields, setFields] = useState<FormField[]>(initialFields.length > 0 ? initialFields : [
        { type: "text", label: "Full Name", name: "name", validation_rules: { required: true }, order: 0, page: 1 },
        { type: "email", label: "Email Address", name: "email", validation_rules: { required: true }, order: 1, page: 1 }
    ])

    const pages = Array.from(new Set(fields.map(f => f.page || 1))).sort((a, b) => a - b)

    const addField = (page: number) => {
        const newField: FormField = {
            type: "text",
            label: "New Field",
            name: `field_${fields.length}`,
            validation_rules: { required: false },
            order: fields.length,
            page: page
        }
        const updated = [...fields, newField]
        setFields(updated)
        onChange(updated)
    }

    const removeField = (index: number) => {
        const updated = fields.filter((_, i) => i !== index)
        setFields(updated)
        onChange(updated)
    }

    const updateField = (index: number, updates: Partial<FormField>) => {
        const updated = [...fields]
        updated[index] = { ...updated[index], ...updates }
        setFields(updated)
        onChange(updated)
    }

    const updateValidation = (index: number, updates: Partial<FormField["validation_rules"]>) => {
        const updated = [...fields]
        updated[index] = {
            ...updated[index],
            validation_rules: { ...updated[index].validation_rules, ...updates }
        }
        setFields(updated)
        onChange(updated)
    }

    const moveField = (index: number, direction: 'up' | 'down') => {
        const updated = [...fields]
        const currentField = updated[index]
        const pageFields = updated.filter(f => (f.page || 1) === (currentField.page || 1))
        const fieldPageIndex = pageFields.findIndex(f => f === currentField)

        if ((direction === 'up' && fieldPageIndex === 0) || (direction === 'down' && fieldPageIndex === pageFields.length - 1)) return

        const targetField = pageFields[direction === 'up' ? fieldPageIndex - 1 : fieldPageIndex + 1]
        const targetIndex = updated.findIndex(f => f === targetField)

        const temp = updated[index]
        updated[index] = updated[targetIndex]
        updated[targetIndex] = temp

        // Update overall order
        const final = updated.map((f, i) => ({ ...f, order: i }))
        setFields(final)
        onChange(final)
    }

    const addPage = () => {
        const nextPath = pages.length > 0 ? Math.max(...pages) + 1 : 1
        addField(nextPath)
    }

    const updatePageTitle = (page: number, title: string) => {
        const updated = fields.map(f => (f.page || 1) === page ? { ...f, page_title: title } : f)
        setFields(updated)
        onChange(updated)
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Layout className="h-5 w-5 text-blue-600" />
                    Form Structure
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addPage} className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5">
                    <Plus className="h-4 w-4" />
                    Add New Page
                </Button>
            </div>

            <div className="space-y-12">
                {pages.map((pageNumber) => (
                    <div key={pageNumber} className="space-y-4 border-l-2 border-slate-200 pl-6 relative">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-slate-200 border-4 border-white" />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs uppercase font-bold text-slate-500">Page {pageNumber} Title</Label>
                                <Input
                                    placeholder="e.g. Personal Information"
                                    className="bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 text-lg font-semibold h-8"
                                    value={fields.find(f => (f.page || 1) === pageNumber)?.page_title || ""}
                                    onChange={(e) => updatePageTitle(pageNumber, e.target.value)}
                                />
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => addField(pageNumber)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Plus className="h-4 w-4 mr-1" /> Add field to Page {pageNumber}
                            </Button>
                        </div>

                        <div className="space-y-4 pt-2">
                            {fields
                                .map((f, i) => ({ ...f, originalIndex: i }))
                                .filter(f => (f.page || 1) === pageNumber)
                                .map((field) => (
                                    <Card key={field.originalIndex} className="relative group border shadow-none hover:border-slate-300 transition-colors">
                                        <CardContent className="p-4 flex gap-4 items-start">
                                            <div className="flex flex-col gap-1 pt-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => moveField(field.originalIndex, 'up')}
                                                >
                                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => moveField(field.originalIndex, 'down')}
                                                >
                                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Field Label</Label>
                                                    <Input
                                                        className="h-9"
                                                        value={field.label}
                                                        onChange={(e) => updateField(field.originalIndex, { label: e.target.value, name: ['name', 'email'].includes(field.name) ? field.name : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs">Field Type</Label>
                                                    <Select
                                                        value={field.type}
                                                        onValueChange={(val) => updateField(field.originalIndex, { type: val })}
                                                        disabled={['name', 'email'].includes(field.name)}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="text">Text</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                            <SelectItem value="email">Email</SelectItem>
                                                            <SelectItem value="date">Date</SelectItem>
                                                            <SelectItem value="select">Dropdown</SelectItem>
                                                            <SelectItem value="radio">Options</SelectItem>
                                                            <SelectItem value="textarea">Paragraph</SelectItem>
                                                            <SelectItem value="file">File Upload</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs">Move to Page</Label>
                                                    <Select
                                                        value={String(field.page || 1)}
                                                        onValueChange={(val) => updateField(field.originalIndex, { page: parseInt(val) })}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {pages.map(p => (
                                                                <SelectItem key={p} value={String(p)}>Page {p}</SelectItem>
                                                            ))}
                                                            <SelectItem value={String(Math.max(...pages) + 1)}>+ New Page ({Math.max(...pages) + 1})</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2 flex flex-col justify-end">
                                                    <div className="flex items-center space-x-2 pb-2">
                                                        <Checkbox
                                                            id={`req-${field.originalIndex}`}
                                                            checked={field.validation_rules.required}
                                                            onCheckedChange={(checked: boolean) => updateValidation(field.originalIndex, { required: !!checked })}
                                                            disabled={['name', 'email'].includes(field.name)}
                                                        />
                                                        <label htmlFor={`req-${field.originalIndex}`} className="text-[12px] font-medium leading-none">
                                                            Mandatory Field
                                                        </label>
                                                    </div>
                                                </div>

                                                {['select', 'radio'].includes(field.type) && (
                                                    <div className="col-span-1 md:col-span-4 space-y-2 bg-slate-50 p-3 rounded-md border mt-1">
                                                        <Label className="text-xs uppercase text-muted-foreground font-bold">Available Options</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {((field.validation_rules as any).options || []).map((opt: string, optIdx: number) => (
                                                                <div key={optIdx} className="flex items-center gap-1 bg-white border px-2 py-1 rounded text-sm group/opt">
                                                                    <span>{opt}</span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-4 w-4 text-destructive"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            const opts = [...((field.validation_rules as any).options || [])]
                                                                            opts.splice(optIdx, 1)
                                                                            updateValidation(field.originalIndex, { options: opts } as any)
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            <div className="flex gap-1 items-center">
                                                                <Input
                                                                    placeholder="Add option and press Enter"
                                                                    className="h-8 w-44 text-xs"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault()
                                                                            const val = e.currentTarget.value.trim()
                                                                            if (val) {
                                                                                const opts = [...((field.validation_rules as any).options || []), val]
                                                                                updateValidation(field.originalIndex, { options: opts } as any)
                                                                                e.currentTarget.value = ""
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {(field.type === 'text' || field.type === 'textarea') && (
                                                    <div className="col-span-1 md:col-span-2 space-y-1">
                                                        <Label className="text-xs text-muted-foreground">MaxLength</Label>
                                                        <Input
                                                            type="number"
                                                            className="h-8"
                                                            value={field.validation_rules.max || ""}
                                                            onChange={(e) => updateValidation(field.originalIndex, { max: parseInt(e.target.value) || undefined })}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {!['name', 'email'].includes(field.name) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeField(field.originalIndex)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </div>
                ))}
            </div>

            <Button type="button" variant="ghost" className="w-full border-2 border-dashed h-20 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300" onClick={addPage}>
                <Plus className="mr-2 h-5 w-5" /> Create Another Page
            </Button>
        </div>
    )
}

