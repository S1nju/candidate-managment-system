"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Trash2, FileText, Upload, Settings2, Loader2, Save } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ContractLayoutEditor } from "./contract-layout-editor"
import { useLanguage } from "@/context/language-context"

interface Position {
    x: number
    y: number
    page: number
}

interface PlaceholderMapping {
    placeholder: string
    source: 'form_field' | 'candidate_data' | 'didit_data' | 'system' | 'static_signature'
    field_name: string
    field_type?: 'text' | 'image' | 'date' | 'file'
    value?: string
    position?: Position
}

interface Contract {
    id?: number
    form_id?: number
    name: string
    description: string
    template_path: string
    placeholders: PlaceholderMapping[]
    order: number
}

interface FormField {
    id?: string
    name: string
    label: string
}

interface FormContractManagerProps {
    formId: string
    fields: FormField[]
}

export function FormContractManager({ formId, fields }: FormContractManagerProps) {
    const { t } = useLanguage()
    const { toast } = useToast()
    const [contracts, setContracts] = useState<Contract[]>([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [editingContract, setEditingContract] = useState<Contract | null>(null)

    const fetchContracts = useCallback(async () => {
        try {
            const res = await axios.get(`/api/forms/${formId}/contracts`)
            setContracts(res.data)
        } catch (error) {
            console.error("Failed to fetch contracts", error)
        } finally {
            setLoading(false)
        }
    }, [formId])

    useEffect(() => {
        if (formId) {
            fetchContracts()
        }
    }, [formId, fetchContracts])

    const handleLayoutSave = async (updatedMappings: PlaceholderMapping[]) => {
        if (!editingContract) return
        try {
            const res = await axios.put(`/api/forms/${formId}/contracts/${editingContract.id}`, {
                placeholders: updatedMappings
            })
            setContracts(prev => prev.map(c => c.id === editingContract.id ? res.data : c))
            toast({ title: "Layout saved successfully" })
            setEditingContract(null)
        } catch (error) {
            toast({ title: "Failed to save layout", variant: "destructive" })
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, contractId?: number) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('template', file)
        formData.append('name', file.name.split('.')[0])

        setUploading(true)
        try {
            if (contractId) {
                const res = await axios.post(`/api/forms/${formId}/contracts/${contractId}?_method=PUT`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                setContracts(prev => prev.map(c => c.id === contractId ? res.data : c))
                toast({ title: "Template updated successfully" })
            } else {
                const res = await axios.post(`/api/forms/${formId}/contracts`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                setContracts(prev => [...prev, res.data])
                toast({ title: "Contract template added" })
            }
        } catch (error) {
            toast({ title: "Upload failed", variant: "destructive" })
        } finally {
            setUploading(false)
            setAdding(false)
        }
    }

    const removeContract = async (id: number) => {
        if (!confirm("Are you sure?")) return
        try {
            await axios.delete(`/api/forms/${formId}/contracts/${id}`)
            setContracts(prev => prev.filter(c => c.id !== id))
            toast({ title: "Contract removed" })
        } catch (error) {
            toast({ title: "Failed to remove contract", variant: "destructive" })
        }
    }

    const updateMapping = async (contractId: number, mapping: PlaceholderMapping[]) => {
        try {
            const res = await axios.put(`/api/forms/${formId}/contracts/${contractId}`, {
                placeholders: mapping
            })
            setContracts(prev => prev.map(c => c.id === contractId ? res.data : c))
            toast({ title: "Mappings saved" })
        } catch (error) {
            toast({ title: "Failed to save mapping", variant: "destructive" })
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium">{t("forms.contracts.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("forms.contracts.subtitle")}</p>
                </div>
                {!adding && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("forms.contracts.add")}
                    </Button>
                )}
            </div>

            {adding && (
                <Card className="border-dashed h-40 flex flex-col items-center justify-center p-6 bg-muted/30">
                    <input type="file" id="new-template" className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                    <Label htmlFor="new-template" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-primary" />
                        <span className="font-semibold text-primary">Click to upload PDF or DOCX template</span>
                        <span className="text-xs text-muted-foreground">Max 5MB</span>
                    </Label>
                    <Button variant="ghost" size="sm" className="mt-4" onClick={() => setAdding(false)}>Cancel</Button>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
                {contracts.map(contract => (
                    <ContractItem
                        key={contract.id}
                        formId={formId}
                        contract={contract}
                        formFields={fields}
                        onDelete={() => removeContract(contract.id!)}
                        onUpdateMapping={(mapping) => updateMapping(contract.id!, mapping)}
                        onEditLayout={() => setEditingContract(contract)}
                    />
                ))}
            </div>

            {editingContract && (
                <ContractLayoutEditor
                    fileUrl={`${axios.defaults.baseURL}/api/forms/${formId}/contracts/${editingContract.id}/template`}
                    mappings={editingContract.placeholders}
                    formFields={fields}
                    onSave={handleLayoutSave}
                    onClose={() => setEditingContract(null)}
                />
            )}

            {contracts.length === 0 && !adding && (
                <div className="text-center p-12 border rounded-lg bg-card shadow-sm">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">{t("forms.contracts.no_contracts")}</p>
                </div>
            )}
        </div>
    )
}

function ContractItem({ formId, contract, formFields, onDelete, onUpdateMapping, onEditLayout }: {
    formId: string,
    contract: Contract,
    formFields: FormField[],
    onDelete: () => void,
    onUpdateMapping: (mapping: PlaceholderMapping[]) => void,
    onEditLayout: () => void
}) {
    const { t } = useLanguage()
    const [isEditing, setIsEditing] = useState(false)
    const [mappings, setMappings] = useState<PlaceholderMapping[]>(contract.placeholders || [])
    const [newPlaceholder, setNewPlaceholder] = useState("")

    // Sync mappings when contract updates (e.g. after layout editor save)
    useEffect(() => {
        setMappings(contract.placeholders || [])
    }, [contract.placeholders])

    const addPlaceholder = () => {
        if (!newPlaceholder) return
        // if (mappings.find(m => m.placeholder === newPlaceholder)) {
        //     alert("Placeholder already exists")
        //     return
        // }
        setMappings([...mappings, { placeholder: newPlaceholder, source: 'form_field', field_name: '', position: undefined }])
        setNewPlaceholder("")
    }

    const removePlaceholder = (idx: number) => {
        setMappings(prev => prev.filter((_, i) => i !== idx))
    }

    const updatePlaceholder = (idx: number, updates: Partial<PlaceholderMapping>) => {
        const next = [...mappings]
        next[idx] = { ...next[idx], ...updates }
        setMappings(next)
    }

    return (
        <Card className="group overflow-hidden bg-card transition-all">
            <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-background border rounded flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base truncate max-w-[200px]">{contract.name}</CardTitle>
                        <CardDescription className="text-xs">{t("forms.contracts.template")}</CardDescription>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8" asChild>
                        <a href={`${axios.defaults.baseURL}/api/forms/${formId}/contracts/${contract.id}/template`} download>
                            <Upload className="h-3 w-3 mr-1 rotate-180" />
                            {t("forms.contracts.template")}
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={onEditLayout}>
                        {t("forms.contracts.edit_layout")}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(!isEditing)}>
                        <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            {isEditing && (
                <CardContent className="p-4 space-y-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">{t("forms.contracts.mapping_title")}</Label>
                        <p className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded">
                            Mapping placeholders from your template (e.g. <code>{"{{candidate_name}}"}</code>) to form or verified data.
                        </p>

                        <div className="space-y-3 mt-4">
                            {Array.from(new Set(mappings.map(m => m.placeholder))).map((placeholderName) => {
                                const mapping = mappings.find(m => m.placeholder === placeholderName)!;
                                // Count instances
                                const instanceCount = mappings.filter(m => m.placeholder === placeholderName && m.position).length;

                                return (
                                    <div key={placeholderName} className="flex gap-2 items-center">
                                        <div className="w-1/3 flex flex-col">
                                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border self-start">{"{{"}{placeholderName}{"}}"}</code>
                                            {instanceCount > 0 && (
                                                <span className="text-[9px] text-blue-500 font-medium ml-1">
                                                    {instanceCount} {instanceCount === 1 ? 'instance placed' : 'instances placed'}
                                                </span>
                                            )}
                                        </div>
                                        <Select
                                            value={mapping.source}
                                            onValueChange={(val: any) => {
                                                setMappings(prev => prev.map(m =>
                                                    m.placeholder === placeholderName ? { ...m, source: val, field_name: '' } : m
                                                ))
                                            }}
                                        >
                                            <SelectTrigger className="w-32 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="form_field">Form Field</SelectItem>
                                                <SelectItem value="didit_data">Verified Data</SelectItem>
                                                <SelectItem value="candidate_data">Internal Data</SelectItem>
                                                <SelectItem value="system">System Tool</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={mapping.field_name}
                                            onValueChange={(val) => {
                                                setMappings(prev => prev.map(m =>
                                                    m.placeholder === placeholderName ? { ...m, field_name: val } : m
                                                ))
                                            }}
                                        >
                                            <SelectTrigger className="flex-1 h-8 text-xs">
                                                <SelectValue placeholder="Select target field..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mapping.source === 'form_field' && formFields.map(f => (
                                                    <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                                                ))}
                                                {mapping.source === 'didit_data' && [
                                                    { id: 'full_name', label: 'Full Name' },
                                                    { id: 'date_of_birth', label: 'Date of Birth' },
                                                    { id: 'nationality', label: 'Nationality' },
                                                    { id: 'issuing_state', label: 'Issuing State' }
                                                ].map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                                ))}
                                                {mapping.source === 'candidate_data' && [
                                                    { id: 'created_at', label: 'Submission Date' },
                                                    { id: 'id', label: 'Candidate ID' }
                                                ].map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                                ))}
                                                {mapping.source === 'system' && [
                                                    { id: 'signature', label: 'Candidate Signature' },
                                                    { id: 'date', label: 'Current Date' },
                                                    { id: 'text', label: 'Custom Text' }
                                                ].map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => {
                                                setMappings(prev => prev.filter(m => m.placeholder !== placeholderName))
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-2 mt-4 items-end bg-muted/30 p-3 rounded border border-dashed">
                            <div className="flex-1 space-y-1">
                                <Label className="text-[10px]">Placeholder in Document (without branches)</Label>
                                <Input
                                    placeholder="e.g. candidate_name"
                                    className="h-8 text-xs bg-background"
                                    value={newPlaceholder}
                                    onChange={(e) => setNewPlaceholder(e.target.value)}
                                />
                            </div>
                            <Button type="button" size="sm" className="h-8" onClick={addPlaceholder}>Add</Button>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button size="sm" onClick={() => {
                                onUpdateMapping(mappings)
                                setIsEditing(false)
                            }} className="flex items-center gap-2">
                                <Save className="h-3.5 w-3.5" />
                                Save Mappings
                            </Button>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
