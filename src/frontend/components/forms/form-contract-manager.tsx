"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Trash2, FileText, Upload, Loader2, Save, Library } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ContractLayoutEditor } from "./contract-layout-editor"
import { useLanguage } from "@/context/language-context"

interface AnnexRule {
    field_name: string
    operator: 'equals' | 'not_equals' | 'contains' | 'in'
    value: string
    document_ids: number[]
}

interface LibraryDoc {
    id: number
    name: string
}

interface Position {
    x: number
    y: number
    page: number
}

interface PlaceholderMapping {
    placeholder: string
    source: 'form_field' | 'candidate_data' | 'didit_data' | 'system' | 'static_signature' | 'concat'
    field_name: string
    field_names?: string[]
    separator?: string
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
    annex_rules?: AnnexRule[]
    font_family?: string | null
    font_size?: number | null
    order: number
}

const FONT_FAMILIES = ['helvetica', 'times', 'courier', 'dejavusans', 'dejavuserif', 'dejavusanscondensed', 'dejavusansmono', 'dejavuserifcondensed', 'freesans', 'freeserif', 'freemono']
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18]
const DEFAULT_FONT_FAMILY = 'helvetica'
const DEFAULT_FONT_SIZE = 12

// Browser approximations of the PDF fonts (PDF sizes are in pt: 1pt = 1.333px).
const FONT_PREVIEW_STACKS: Record<string, string> = {
    helvetica: 'Helvetica, Arial, sans-serif',
    times: '"Times New Roman", Times, serif',
    courier: '"Courier New", Courier, monospace',
    dejavusans: '"DejaVu Sans", Verdana, sans-serif',
    dejavuserif: '"DejaVu Serif", Georgia, serif',
    dejavusanscondensed: '"DejaVu Sans Condensed", "Arial Narrow", sans-serif',
    dejavusansmono: '"DejaVu Sans Mono", Menlo, monospace',
    dejavuserifcondensed: '"DejaVu Serif Condensed", Georgia, serif',
    freesans: '"FreeSans", Arial, sans-serif',
    freeserif: '"FreeSerif", "Times New Roman", serif',
    freemono: '"FreeMono", "Courier New", monospace',
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
    const [libraryDocs, setLibraryDocs] = useState<LibraryDoc[]>([])

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

    useEffect(() => {
        axios.get("/api/library-documents").then(res => setLibraryDocs(res.data)).catch(() => {})
    }, [])

    const handleLayoutSave = async (updatedMappings: PlaceholderMapping[]) => {
        if (!editingContract) return
        try {
            const res = await axios.put(`/api/forms/${formId}/contracts/${editingContract.id}`, {
                placeholders: updatedMappings
            })
            setContracts(prev => prev.map(c => c.id === editingContract.id ? res.data : c))
            toast({ title: t("forms.contracts.layout_saved") })
            setEditingContract(null)
        } catch (error) {
            toast({ title: t("forms.contracts.layout_save_failed"), variant: "destructive" })
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
                toast({ title: t("forms.contracts.template_updated") })
            } else {
                const res = await axios.post(`/api/forms/${formId}/contracts`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                setContracts(prev => [...prev, res.data])
                toast({ title: t("forms.contracts.template_added") })
            }
        } catch (error) {
            toast({ title: t("forms.contracts.upload_failed"), variant: "destructive" })
        } finally {
            setUploading(false)
            setAdding(false)
        }
    }

    const removeContract = async (id: number) => {
        if (!confirm(t("forms.contracts.confirm_delete"))) return
        try {
            await axios.delete(`/api/forms/${formId}/contracts/${id}`)
            setContracts(prev => prev.filter(c => c.id !== id))
            toast({ title: t("forms.contracts.removed") })
        } catch (error) {
            toast({ title: t("forms.contracts.remove_failed"), variant: "destructive" })
        }
    }

    const updateMapping = async (contractId: number, mapping: PlaceholderMapping[]) => {
        try {
            const res = await axios.put(`/api/forms/${formId}/contracts/${contractId}`, {
                placeholders: mapping
            })
            setContracts(prev => prev.map(c => c.id === contractId ? res.data : c))
            toast({ title: t("forms.contracts.mapping_saved") })
        } catch (error) {
            toast({ title: t("forms.contracts.mapping_save_failed"), variant: "destructive" })
        }
    }

    const updateContractStyle = async (contractId: number, style: { font_family: string | null, font_size: number | null }) => {
        try {
            const res = await axios.put(`/api/forms/${formId}/contracts/${contractId}`, style)
            setContracts(prev => prev.map(c => c.id === contractId ? res.data : c))
            toast({ title: t("forms.contracts.font_saved") })
        } catch (error) {
            toast({ title: t("forms.contracts.font_save_failed"), variant: "destructive" })
        }
    }

    const updateAnnexRules = async (contractId: number, rules: AnnexRule[]) => {
        try {
            const res = await axios.put(`/api/forms/${formId}/contracts/${contractId}`, {
                annex_rules: rules
            })
            setContracts(prev => prev.map(c => c.id === contractId ? res.data : c))
            toast({ title: t("forms.contracts.annexes.rules_saved") })
        } catch (error) {
            toast({ title: t("forms.contracts.annexes.rules_save_failed"), variant: "destructive" })
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
                        <span className="font-semibold text-primary">{t("forms.contracts.upload_label")}</span>
                        <span className="text-xs text-muted-foreground">{t("forms.contracts.max_size")}</span>
                    </Label>
                    <Button variant="ghost" size="sm" className="mt-4" onClick={() => setAdding(false)}>{t("common.cancel")}</Button>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
                {contracts.map(contract => (
                    <ContractItem
                        key={contract.id}
                        formId={formId}
                        contract={contract}
                        formFields={fields}
                        libraryDocs={libraryDocs}
                        onDelete={() => removeContract(contract.id!)}
                        onUpdateMapping={(mapping) => updateMapping(contract.id!, mapping)}
                        onUpdateAnnexRules={(rules) => updateAnnexRules(contract.id!, rules)}
                        onUpdateStyle={(style) => updateContractStyle(contract.id!, style)}
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

function ContractItem({ formId, contract, formFields, libraryDocs, onDelete, onUpdateMapping, onUpdateAnnexRules, onUpdateStyle, onEditLayout }: {
    formId: string,
    contract: Contract,
    formFields: FormField[],
    libraryDocs: LibraryDoc[],
    onDelete: () => void,
    onUpdateMapping: (mapping: PlaceholderMapping[]) => void,
    onUpdateAnnexRules: (rules: AnnexRule[]) => void,
    onUpdateStyle: (style: { font_family: string | null, font_size: number | null }) => void,
    onEditLayout: () => void
}) {
    const { t } = useLanguage()
    const [isEditing, setIsEditing] = useState(false)
    const [mappings, setMappings] = useState<PlaceholderMapping[]>(contract.placeholders || [])
    const [newPlaceholder, setNewPlaceholder] = useState("")
    const [annexRules, setAnnexRules] = useState<AnnexRule[]>(contract.annex_rules || [])

    // Sync mappings when contract updates (e.g. after layout editor save)
    useEffect(() => {
        setMappings(contract.placeholders || [])
    }, [contract.placeholders])

    useEffect(() => {
        setAnnexRules(contract.annex_rules || [])
    }, [contract.annex_rules])

    const addAnnexRule = () => {
        setAnnexRules(prev => [...prev, { field_name: '', operator: 'equals', value: '', document_ids: [] }])
    }

    const updateAnnexRule = (idx: number, updates: Partial<AnnexRule>) => {
        setAnnexRules(prev => prev.map((r, i) => i === idx ? { ...r, ...updates } : r))
    }

    const toggleAnnexDocument = (idx: number, docId: number) => {
        setAnnexRules(prev => prev.map((r, i) => {
            if (i !== idx) return r
            const has = r.document_ids.includes(docId)
            return { ...r, document_ids: has ? r.document_ids.filter(id => id !== docId) : [...r.document_ids, docId] }
        }))
    }

    const removeAnnexRule = (idx: number) => {
        setAnnexRules(prev => prev.filter((_, i) => i !== idx))
    }

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
            <CardHeader
                className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                role="button"
                tabIndex={0}
                aria-expanded={isEditing}
                onClick={() => setIsEditing(!isEditing)}
                onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        setIsEditing(!isEditing)
                    }
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-background border rounded flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-left">
                        <CardTitle className="text-base truncate max-w-[200px]">{contract.name}</CardTitle>
                        <CardDescription className="text-xs">{t("forms.contracts.template")}</CardDescription>
                    </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="h-8" asChild>
                        <a href={`${axios.defaults.baseURL}/api/forms/${formId}/contracts/${contract.id}/template`} download>
                            <Upload className="h-3 w-3 mr-1 rotate-180" />
                            {t("forms.contracts.template")}
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={onEditLayout}>
                        {t("forms.contracts.edit_layout")}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            {isEditing && (
                <CardContent className="p-4 space-y-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2 pb-4 border-b">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">{t("forms.contracts.font_title")}</Label>
                        <p className="text-xs text-muted-foreground">{t("forms.contracts.font_desc")}</p>
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <div className="space-y-1">
                                <Label className="text-[10px]">{t("forms.contracts.font_family_label")}</Label>
                                <Select
                                    value={contract.font_family || "default"}
                                    onValueChange={(val) => onUpdateStyle({
                                        font_family: val === "default" ? null : val,
                                        font_size: contract.font_size ?? null,
                                    })}
                                >
                                    <SelectTrigger className="w-64 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">{t("forms.contracts.font_default")}</SelectItem>
                                        {FONT_FAMILIES.map(f => (
                                            <SelectItem key={f} value={f}>{t(`forms.contracts.font_families.${f}`)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px]">{t("forms.contracts.font_size_label")}</Label>
                                <Select
                                    value={contract.font_size ? String(contract.font_size) : "default"}
                                    onValueChange={(val) => onUpdateStyle({
                                        font_family: contract.font_family ?? null,
                                        font_size: val === "default" ? null : Number(val),
                                    })}
                                >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">{t("forms.contracts.font_default")}</SelectItem>
                                        {FONT_SIZES.map(size => (
                                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 min-w-0 flex-1 basis-56">
                                <Label className="text-[10px]">{t("forms.contracts.font_preview_label")}</Label>
                                <div className="flex h-12 items-center overflow-hidden rounded-md border bg-white px-3 text-black">
                                    <span
                                        className="truncate font-bold"
                                        style={{
                                            fontFamily: FONT_PREVIEW_STACKS[contract.font_family || DEFAULT_FONT_FAMILY] ?? FONT_PREVIEW_STACKS[DEFAULT_FONT_FAMILY],
                                            fontSize: `${(contract.font_size || DEFAULT_FONT_SIZE) * (4 / 3)}px`,
                                        }}
                                    >
                                        Lorem Ipsum 1234
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">{t("forms.contracts.mapping_title")}</Label>
                        <p className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded">
                            {t("forms.contracts.mapping_desc")}
                        </p>

                        <div className="space-y-3 mt-4">
                            {Array.from(new Set(mappings.map(m => m.placeholder))).map((placeholderName) => {
                                const mapping = mappings.find(m => m.placeholder === placeholderName)!;
                                // Count instances
                                const instanceCount = mappings.filter(m => m.placeholder === placeholderName && m.position).length;

                                return (
                                    <div key={placeholderName} className="flex gap-2 items-start">
                                        <div className="w-1/3 flex flex-col">
                                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border self-start">{"{{"}{placeholderName}{"}}"}</code>
                                            {instanceCount > 0 && (
                                                <span className="text-[9px] text-blue-500 font-medium ml-1">
                                                    {instanceCount} {instanceCount === 1 ? t("forms.contracts.instance_placed") : t("forms.contracts.instances_placed")}
                                                </span>
                                            )}
                                        </div>
                                        <Select
                                            value={mapping.source}
                                            onValueChange={(val: any) => {
                                                setMappings(prev => prev.map(m =>
                                                    m.placeholder === placeholderName
                                                        ? { ...m, source: val, field_name: '', ...(val === 'concat' ? { field_names: [], separator: ' ' } : {}) }
                                                        : m
                                                ))
                                            }}
                                        >
                                            <SelectTrigger className="w-32 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="form_field">{t("forms.contracts.field_options.form_field")}</SelectItem>
                                                <SelectItem value="concat">{t("forms.contracts.field_options.concat")}</SelectItem>
                                                <SelectItem value="didit_data">{t("forms.contracts.field_options.verified_data")}</SelectItem>
                                                <SelectItem value="candidate_data">{t("forms.contracts.field_options.internal_data")}</SelectItem>
                                                <SelectItem value="system">{t("forms.contracts.field_options.system_tool")}</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {mapping.source === 'concat' ? (
                                            <div className="flex-1 space-y-2">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(mapping.field_names || []).map((name, i) => (
                                                        <span key={`${name}-${i}`} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs">
                                                            {formFields.find(f => f.name === name)?.label || name}
                                                            <button
                                                                type="button"
                                                                className="text-muted-foreground hover:text-destructive"
                                                                title={t("forms.contracts.concat_remove")}
                                                                onClick={() => setMappings(prev => prev.map(m =>
                                                                    m.placeholder === placeholderName
                                                                        ? { ...m, field_names: (m.field_names || []).filter((_, idx) => idx !== i) }
                                                                        : m
                                                                ))}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                    {(mapping.field_names || []).length === 0 && (
                                                        <span className="text-xs text-muted-foreground italic">{t("forms.contracts.concat_empty")}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Select
                                                        value=""
                                                        onValueChange={(val) => setMappings(prev => prev.map(m =>
                                                            m.placeholder === placeholderName
                                                                ? { ...m, field_names: [...(m.field_names || []), val] }
                                                                : m
                                                        ))}
                                                    >
                                                        <SelectTrigger className="flex-1 h-8 text-xs">
                                                            <SelectValue placeholder={t("forms.contracts.concat_add_field")} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {formFields.map(f => (
                                                                <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        className="w-32 h-8 text-xs bg-background"
                                                        aria-label={t("forms.contracts.concat_separator_label")}
                                                        placeholder={t("forms.contracts.concat_separator_label")}
                                                        value={mapping.separator ?? ' '}
                                                        onChange={(e) => setMappings(prev => prev.map(m =>
                                                            m.placeholder === placeholderName ? { ...m, separator: e.target.value } : m
                                                        ))}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                        <Select
                                            value={mapping.field_name}
                                            onValueChange={(val) => {
                                                setMappings(prev => prev.map(m =>
                                                    m.placeholder === placeholderName ? { ...m, field_name: val } : m
                                                ))
                                            }}
                                        >
                                            <SelectTrigger className="flex-1 h-8 text-xs">
                                                <SelectValue placeholder={t("forms.contracts.select_target")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mapping.source === 'form_field' && formFields.map(f => (
                                                    <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                                                ))}
                                                {mapping.source === 'didit_data' && [
                                                    { id: 'full_name', label: t("forms.contracts.field_options.full_name") },
                                                    { id: 'date_of_birth', label: t("forms.contracts.field_options.date_of_birth") },
                                                    { id: 'nationality', label: t("forms.contracts.field_options.nationality") },
                                                    { id: 'issuing_state', label: t("forms.contracts.field_options.issuing_state") }
                                                ].map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                                ))}
                                                {mapping.source === 'candidate_data' && [
                                                    { id: 'created_at', label: t("forms.contracts.field_options.submission_date") },
                                                    { id: 'id', label: t("forms.contracts.field_options.candidate_id") }
                                                ].map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                                ))}
                                                {mapping.source === 'system' && [
                                                    { id: 'signature', label: t("forms.contracts.field_options.candidate_signature") },
                                                    { id: 'date', label: t("forms.contracts.field_options.current_date") },
                                                    { id: 'text', label: t("forms.contracts.field_options.custom_text") }
                                                ].map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        )}

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
                                <Label className="text-[10px]">{t("forms.contracts.placeholder_label")}</Label>
                                <Input
                                    placeholder={t("forms.contracts.placeholder_example")}
                                    className="h-8 text-xs bg-background"
                                    value={newPlaceholder}
                                    onChange={(e) => setNewPlaceholder(e.target.value)}
                                />
                            </div>
                            <Button type="button" size="sm" className="h-8" onClick={addPlaceholder}>{t("forms.contracts.add_button")}</Button>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs uppercase font-bold text-muted-foreground">{t("forms.contracts.annexes.title")}</Label>
                            <Link href="/dashboard/library" className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Library className="h-3 w-3" />
                                {t("forms.contracts.annexes.manage_library")}
                            </Link>
                        </div>
                        <p className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded">
                            {t("forms.contracts.annexes.subtitle")}
                        </p>

                        {annexRules.length === 0 && (
                            <p className="text-xs text-muted-foreground italic py-2">{t("forms.contracts.annexes.no_rules")}</p>
                        )}

                        <div className="space-y-3 mt-2">
                            {annexRules.map((rule, idx) => (
                                <div key={idx} className="border border-dashed rounded p-3 space-y-2 bg-muted/20">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="text-xs text-muted-foreground shrink-0">{t("forms.contracts.annexes.if_field")}</span>
                                        <Select value={rule.field_name} onValueChange={(val) => updateAnnexRule(idx, { field_name: val })}>
                                            <SelectTrigger className="w-40 h-8 text-xs">
                                                <SelectValue placeholder={t("forms.contracts.annexes.select_field")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {formFields.map(f => (
                                                    <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={rule.operator} onValueChange={(val: any) => updateAnnexRule(idx, { operator: val })}>
                                            <SelectTrigger className="w-64 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="equals">{t("forms.contracts.annexes.operator_equals")}</SelectItem>
                                                <SelectItem value="not_equals">{t("forms.contracts.annexes.operator_not_equals")}</SelectItem>
                                                <SelectItem value="contains">{t("forms.contracts.annexes.operator_contains")}</SelectItem>
                                                <SelectItem value="in">{t("forms.contracts.annexes.operator_in")}</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Input
                                            className="flex-1 min-w-32 h-8 text-xs bg-background"
                                            placeholder={t("forms.contracts.annexes.value_placeholder")}
                                            value={rule.value}
                                            onChange={(e) => updateAnnexRule(idx, { value: e.target.value })}
                                        />

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive shrink-0"
                                            onClick={() => removeAnnexRule(idx)}
                                            title={t("forms.contracts.annexes.remove_rule")}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-3 items-center pl-1">
                                        <span className="text-xs text-muted-foreground shrink-0">{t("forms.contracts.annexes.then_attach")}</span>
                                        {libraryDocs.length === 0 ? (
                                            <span className="text-xs text-muted-foreground italic">{t("forms.contracts.annexes.no_documents")}</span>
                                        ) : (
                                            libraryDocs.map(doc => (
                                                <label key={doc.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                                    <Checkbox
                                                        checked={rule.document_ids.includes(doc.id)}
                                                        onCheckedChange={() => toggleAnnexDocument(idx, doc.id)}
                                                    />
                                                    {doc.name}
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={addAnnexRule} className="flex items-center gap-2">
                                <Plus className="h-3.5 w-3.5" />
                                {t("forms.contracts.annexes.add_rule")}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onUpdateAnnexRules(annexRules)} className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10">
                                <Save className="h-3.5 w-3.5" />
                                {t("forms.contracts.annexes.save_rules")}
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button size="sm" onClick={() => {
                            onUpdateMapping(mappings)
                            setIsEditing(false)
                        }} className="flex items-center gap-2">
                            <Save className="h-3.5 w-3.5" />
                            {t("forms.contracts.save_mappings")}
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
