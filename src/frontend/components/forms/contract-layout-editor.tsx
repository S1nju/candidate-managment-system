"use client"

import React, { useState, useCallback, useRef, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    X,
    GripVertical,
    Save,
    Trash2,
    PenTool,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import useSWR from "swr"
import axios from "@/lib/axios"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Position {
    x: number // Percentage 0-100
    y: number // Percentage 0-100
    width?: number // Percentage of page width (for images/blocks)
    height?: number // Percentage of page height
    page: number
}

interface PlaceholderMapping {
    placeholder: string
    source: 'form_field' | 'candidate_data' | 'didit_data' | 'system' | 'static_signature'
    field_name: string
    field_type?: 'text' | 'image' | 'date' | 'file' // Added type tracking
    value?: string // For static values (like signature URLs)
    position?: Position
}

interface ContractLayoutEditorProps {
    fileUrl: string
    mappings: PlaceholderMapping[]
    formFields: any[] // Pass full field definitions to know types
    onSave: (mappings: PlaceholderMapping[]) => void
    onClose: () => void
}

export function ContractLayoutEditor({ fileUrl, mappings, formFields = [], onSave, onClose }: ContractLayoutEditorProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [scale, setScale] = useState<number>(1.0)
    const [localMappings, setLocalMappings] = useState<PlaceholderMapping[]>(mappings)
    const containerRef = useRef<HTMLDivElement>(null)

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages)
    }

    // Helper to get field type
    const getFieldType = useCallback((m: PlaceholderMapping) => {
        if (m.field_type) return m.field_type;
        if (m.source === 'form_field') {
            const field = formFields.find(f => f.name === m.field_name);
            if (field?.type === 'file' && (field.name.includes('photo') || field.name.includes('image'))) return 'image';
            if (field?.type === 'image') return 'image';
        }
        return 'text';
    }, [formFields]);

    // Identify unique placeholders for the sidebar list
    const uniquePlaceholders = useMemo(() => {
        const unique = new Map<string, PlaceholderMapping>();
        localMappings.forEach(m => {
            if (!unique.has(m.placeholder)) {
                // Enrich with type info if missing
                const enriched = { ...m, field_type: getFieldType(m) };
                unique.set(m.placeholder, enriched);
            }
        });
        return Array.from(unique.values());
    }, [localMappings, getFieldType]);

    const removeInstance = (index: number) => {
        setLocalMappings(prev => prev.filter((_, i) => i !== index))
    }

    // Add a NEW instance of the placeholder
    const addInstance = (template: PlaceholderMapping) => {
        const type = getFieldType(template);
        const defaultSize = type === 'image' ? { width: 20, height: 10 } : {}; // 20% width default for images

        setLocalMappings(prev => [
            ...prev,
            {
                ...template,
                field_type: type,
                position: { x: 50, y: 50, page: pageNumber, ...defaultSize }
            }
        ])
    }

    // Check if a placeholder type has ANY placed instances
    const hasPlacedInstances = (placeholder: string) => {
        return localMappings.some(m => m.placeholder === placeholder && m.position !== undefined);
    }

    const fileConfig = useMemo(() => ({
        url: fileUrl,
        withCredentials: true,
    }), [fileUrl])

    // Fetch saved signatures for static placement
    const { data: signaturesData } = useSWR("/api/signatures", (url) => axios.get(url).then(res => res.data))
    const savedSignatures = signaturesData?.data || []

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            {/* ... keeping header as is ... */}
            <div className="border-b p-4 flex items-center justify-between bg-card">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">Contract Layout Editor</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 border rounded px-1 mr-4 bg-muted/50">
                        <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs w-12 text-center font-medium">{Math.round(scale * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={() => {
                        console.log("Saving mappings:", localMappings);
                        onSave(localMappings);
                    }} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Layout
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Placeholders */}
                <div className="w-72 border-r bg-muted/10 p-4 overflow-y-auto">
                    {/* System Tools */}
                    <h3 className="text-xs font-bold uppercase text-muted-foreground mb-4">Interactive Tools</h3>
                    <div className="space-y-2 mb-6 border-b dark:border-slate-800 pb-6">
                        <div
                            className="p-3 rounded-lg border bg-card flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer"
                            onClick={() => {
                                const count = localMappings.filter(m => m.field_name === 'signature').length + 1;
                                const uniqueId = Date.now().toString(36);
                                addInstance({ placeholder: `signature_${uniqueId}`, source: 'system', field_name: 'signature', field_type: 'image' })
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <PenTool className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium">Candidate Signature</span>
                            </div>
                            <Plus className="h-3 w-3" />
                        </div>
                        <div
                            className="p-3 rounded-lg border bg-card flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer"
                            onClick={() => {
                                const uniqueId = Date.now().toString(36);
                                addInstance({ placeholder: `initials_${uniqueId}`, source: 'system', field_name: 'initials', field_type: 'image' })
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <PenTool className="h-4 w-4 text-indigo-500" />
                                <span className="text-sm font-medium">Candidate Initials</span>
                            </div>
                            <Plus className="h-3 w-3" />
                        </div>
                        <div
                            className="p-3 rounded-lg border bg-card flex items-center justify-between group hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer"
                            onClick={() => {
                                const uniqueId = Date.now().toString(36);
                                addInstance({ placeholder: `admin_signature_${uniqueId}`, source: 'system', field_name: 'admin_signature', field_type: 'image' })
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <PenTool className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-medium">Admin Signature</span>
                            </div>
                            <Plus className="h-3 w-3" />
                        </div>
                        <div
                            className="p-3 rounded-lg border bg-card flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer"
                            onClick={() => addInstance({ placeholder: 'date', source: 'system', field_name: 'date', field_type: 'date' })}
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium">System Date</span>
                            </div>
                            <Plus className="h-3 w-3" />
                        </div>
                        <div
                            className="p-3 rounded-lg border bg-card flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer"
                            onClick={() => addInstance({ placeholder: 'custom_text', source: 'system', field_name: 'text', field_type: 'text' })}
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">Custom Text</span>
                            </div>
                            <Plus className="h-3 w-3" />
                        </div>
                    </div>

                    {savedSignatures.length > 0 && (
                        <>
                            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-4">Company Signatures (Static)</h3>
                            <div className="grid grid-cols-2 gap-2 mb-6 border-b dark:border-slate-800 pb-6">
                                {savedSignatures.map((sig: any) => (
                                    <div
                                        key={sig.id}
                                        className="border rounded p-2 bg-white dark:bg-slate-900 cursor-pointer hover:border-primary transition-colors"
                                        onClick={() => addInstance({
                                            placeholder: `static_sig_${sig.id}`,
                                            source: 'static_signature',
                                            field_name: 'static_signature',
                                            field_type: 'image',
                                            value: sig.value // Pass the image path/url
                                        })}
                                        title="Click to place as static image"
                                    >
                                        <div className="h-12 flex items-center justify-center overflow-hidden">
                                            <img src={sig.value} alt="Sig" className="max-h-full max-w-full object-contain" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <h3 className="text-xs font-bold uppercase text-muted-foreground mb-4">Form Fields (Auto-Fill)</h3>
                    <p className="text-[10px] text-muted-foreground mb-4">Click + to add a field to the current page. You can add the same field multiple times.</p>
                    <div className="space-y-2">
                        {uniquePlaceholders.map((m) => {
                            const isPlaced = hasPlacedInstances(m.placeholder);
                            return (
                                <div
                                    key={m.placeholder}
                                    className={`p-3 rounded-lg border bg-card flex items-center justify-between group ${isPlaced ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10' : ''}`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className={`h-4 w-4 ${isPlaced ? 'text-blue-500' : 'text-slate-400'}`} />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm truncate font-medium" title={m.placeholder}>{m.placeholder}</span>
                                            <span className="text-[10px] text-muted-foreground truncate">{m.source === 'form_field' ? `Field: ${m.field_name}` : m.source}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-blue-100 hover:text-blue-600" onClick={() => addInstance(m)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Main Content - PDF Viewer */}
                <div className="flex-1 bg-slate-200 dark:bg-slate-900 overflow-auto p-8 flex flex-col items-center gap-4" ref={containerRef}>
                    <div className="flex items-center gap-4 mb-4 bg-card p-2 rounded-full shadow-lg border px-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                            disabled={pageNumber <= 1}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-sm font-medium">
                            Page {pageNumber} of {numPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                            disabled={pageNumber >= numPages}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="relative shadow-2xl bg-white border-8 border-background">
                        <Document
                            file={fileConfig as any}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(error) => console.error("PDF Load Error:", error)}
                            loading={<div className="p-20">Loading Document template...</div>}
                        >
                            <div className="relative">
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                />
                                {/* Overlay for placeholders */}
                                <div className="absolute inset-0 z-10 pointer-events-none">
                                    {localMappings
                                        .map((m, idx) => ({ ...m, originalIndex: idx, computedType: getFieldType(m) }))
                                        .filter(m => m.position?.page === pageNumber)
                                        .map(m => (
                                            <div
                                                key={`${m.placeholder}-${m.originalIndex}`}
                                                className="absolute pointer-events-auto cursor-move group"
                                                style={{
                                                    left: `${m.position!.x}%`,
                                                    top: `${m.position!.y}%`,
                                                    width: m.computedType === 'image' ? `${m.position!.width || 20}%` : 'auto',
                                                    height: m.computedType === 'image' ? `${m.position!.height || 10}%` : 'auto',
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                                onMouseDown={(e) => {
                                                    const startX = e.clientX;
                                                    const startY = e.clientY;
                                                    const initialX = m.position!.x;
                                                    const initialY = m.position!.y;
                                                    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();

                                                    e.stopPropagation();

                                                    const onMouseMove = (moveEvent: MouseEvent) => {
                                                        const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
                                                        const dy = ((moveEvent.clientY - startY) / rect.height) * 100;

                                                        setLocalMappings(prev => {
                                                            const next = [...prev];
                                                            next[m.originalIndex] = {
                                                                ...next[m.originalIndex],
                                                                position: {
                                                                    ...next[m.originalIndex].position!,
                                                                    x: Math.max(0, Math.min(100, initialX + dx)),
                                                                    y: Math.max(0, Math.min(100, initialY + dy))
                                                                }
                                                            };
                                                            return next;
                                                        });
                                                    };

                                                    const onMouseUp = () => {
                                                        document.removeEventListener('mousemove', onMouseMove);
                                                        document.removeEventListener('mouseup', onMouseUp);
                                                    };

                                                    document.addEventListener('mousemove', onMouseMove);
                                                    document.addEventListener('mouseup', onMouseUp);
                                                }}
                                            >
                                                {m.computedType === 'image' ? (
                                                    <div className="w-full h-full bg-blue-100/50 dark:bg-blue-900/30 border-2 border-blue-500 border-dashed backdrop-blur-sm opacity-80 flex items-center justify-center relative">
                                                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 truncate px-1">Img: {m.placeholder}</span>
                                                        <div
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeInstance(m.originalIndex);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </div>
                                                        {/* Resize Handle (Simplified) */}
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation();
                                                                const startX = e.clientX;
                                                                const startY = e.clientY;
                                                                const initW = m.position!.width || 20;
                                                                const initH = m.position!.height || 10;
                                                                const rect = (e.currentTarget.closest('.absolute.pointer-events-auto')!.parentElement as HTMLElement).getBoundingClientRect();

                                                                const onResizeMove = (moveEvent: MouseEvent) => {
                                                                    const dw = ((moveEvent.clientX - startX) / rect.width) * 100;
                                                                    const dh = ((moveEvent.clientY - startY) / rect.height) * 100;

                                                                    setLocalMappings(prev => {
                                                                        const next = [...prev];
                                                                        next[m.originalIndex] = {
                                                                            ...next[m.originalIndex],
                                                                            position: {
                                                                                ...next[m.originalIndex].position!,
                                                                                width: Math.max(5, initW + dw),
                                                                                height: Math.max(2, initH + dh)
                                                                            }
                                                                        };
                                                                        return next;
                                                                    });
                                                                }
                                                                const onResizeUp = () => {
                                                                    document.removeEventListener('mousemove', onResizeMove);
                                                                    document.removeEventListener('mouseup', onResizeUp);
                                                                };
                                                                document.addEventListener('mousemove', onResizeMove);
                                                                document.addEventListener('mouseup', onResizeUp);
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <div className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow-md whitespace-nowrap flex items-center gap-1 hover:bg-blue-700 transition-colors">
                                                            <GripVertical className="h-3 w-3 opacity-50" />
                                                            {"{{"}{m.placeholder}{"}}"}
                                                        </div>
                                                        <div
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeInstance(m.originalIndex);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </Document>
                    </div>
                </div>
            </div>
        </div>
    )
}


function Plus({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14" /><path d="M12 5v14" />
        </svg>
    )
}
