"use client"
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
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
}

interface FormBuilderProps {
    initialFields?: FormField[]
    onChange: (fields: FormField[]) => void
}

export function FormBuilder({ initialFields = [], onChange }: FormBuilderProps) {
    const [fields, setFields] = useState<FormField[]>(initialFields.length > 0 ? initialFields : [
        { type: "text", label: "Full Name", name: "name", validation_rules: { required: true }, order: 0 },
        { type: "email", label: "Email Address", name: "email", validation_rules: { required: true }, order: 1 }
    ])

    const addField = () => {
        const newField: FormField = {
            type: "text",
            label: "New Field",
            name: `field_${fields.length}`,
            validation_rules: { required: false },
            order: fields.length
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
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return

        const updated = [...fields]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        const temp = updated[index]
        updated[index] = updated[targetIndex]
        updated[targetIndex] = temp

        // Update order property
        const final = updated.map((f, i) => ({ ...f, order: i }))
        setFields(final)
        onChange(final)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Form Fields</h3>
                <Button type="button" variant="outline" size="sm" onClick={addField} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Field
                </Button>
            </div>

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <Card key={index} className="relative group">
                        <CardContent className="p-4 flex gap-4 items-start">
                            <div className="flex flex-col gap-1 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveField(index, 'up')}
                                    disabled={index === 0}
                                >
                                    <ChevronDown className="h-4 w-4 rotate-180" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveField(index, 'down')}
                                    disabled={index === fields.length - 1}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={field.label}
                                        onChange={(e) => updateField(index, { label: e.target.value, name: ['name', 'email'].includes(field.name) ? field.name : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={field.type}
                                        onValueChange={(val) => updateField(index, { type: val })}
                                        disabled={['name', 'email'].includes(field.name)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="number">Number</SelectItem>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="select">Dropdown (Select)</SelectItem>
                                            <SelectItem value="radio">Radio Buttons</SelectItem>
                                            <SelectItem value="textarea">Long Text</SelectItem>
                                            <SelectItem value="file">File</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 flex flex-col justify-end">
                                    <div className="flex items-center space-x-2 pb-2">
                                        <Checkbox
                                            id={`req-${index}`}
                                            checked={field.validation_rules.required}
                                            onCheckedChange={(checked: boolean) => updateValidation(index, { required: !!checked })}
                                            disabled={['name', 'email'].includes(field.name)}
                                        />
                                        <label htmlFor={`req-${index}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Required
                                        </label>
                                    </div>
                                </div>

                                {['select', 'radio'].includes(field.type) && (
                                    <div className="col-span-1 md:col-span-3 space-y-2 bg-slate-50 p-3 rounded-md border mt-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-bold">Options</Label>
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
                                                            updateValidation(index, { options: opts } as any)
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="flex gap-1 items-center">
                                                <Input
                                                    placeholder="Add option..."
                                                    className="h-8 w-32 text-xs"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            const val = e.currentTarget.value.trim()
                                                            if (val) {
                                                                const opts = [...((field.validation_rules as any).options || []), val]
                                                                updateValidation(index, { options: opts } as any)
                                                                e.currentTarget.value = ""
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {field.type === 'text' || field.type === 'textarea' ? (
                                    <div className="space-y-2">
                                        <Label>Max Characters</Label>
                                        <Input
                                            type="number"
                                            value={field.validation_rules.max || ""}
                                            onChange={(e) => updateValidation(index, { max: parseInt(e.target.value) || undefined })}
                                        />
                                    </div>
                                ) : null}

                                {field.type === 'number' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label>Min</Label>
                                            <Input
                                                type="number"
                                                value={field.validation_rules.min || ""}
                                                onChange={(e) => updateValidation(index, { min: parseInt(e.target.value) || undefined })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max</Label>
                                            <Input
                                                type="number"
                                                value={field.validation_rules.max || ""}
                                                onChange={(e) => updateValidation(index, { max: parseInt(e.target.value) || undefined })}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {!['name', 'email'].includes(field.name) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeField(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Button type="button" variant="ghost" className="w-full border-2 border-dashed h-20" onClick={addField}>
                <Plus className="mr-2 h-4 w-4" /> Add Another Field
            </Button>
        </div>
    )
}
