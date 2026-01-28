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
    Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Position {
    x: number // Percentage 0-100
    y: number // Percentage 0-100
    page: number
}

interface PlaceholderMapping {
    placeholder: string
    source: 'form_field' | 'candidate_data' | 'didit_data'
    field_name: string
    position?: Position
}

interface ContractLayoutEditorProps {
    fileUrl: string
    mappings: PlaceholderMapping[]
    onSave: (mappings: PlaceholderMapping[]) => void
    onClose: () => void
}

export function ContractLayoutEditor({ fileUrl, mappings, onSave, onClose }: ContractLayoutEditorProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [scale, setScale] = useState<number>(1.0)
    const [localMappings, setLocalMappings] = useState<PlaceholderMapping[]>(mappings)
    const containerRef = useRef<HTMLDivElement>(null)

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages)
    }

    const removeItemPosition = (placeholder: string) => {
        setLocalMappings(prev => prev.map(m =>
            m.placeholder === placeholder ? { ...m, position: undefined } : m
        ))
    }

    const placeOnCurrentPage = (placeholder: string) => {
        setLocalMappings(prev => prev.map(m =>
            m.placeholder === placeholder ? { ...m, position: { x: 50, y: 50, page: pageNumber } } : m
        ))
    }

    const fileConfig = useMemo(() => ({
        url: fileUrl,
        withCredentials: true,
    }), [fileUrl])

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">Contract Layout Editor</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 border rounded px-1 mr-4">
                        <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={() => onSave(localMappings)} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Layout
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Placeholders */}
                <div className="w-64 border-r bg-slate-50 p-4 overflow-y-auto">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground mb-4">Available Data</h3>
                    <div className="space-y-2">
                        {localMappings.map((m) => (
                            <div
                                key={m.placeholder}
                                className={`p-3 rounded-lg border bg-white flex items-center justify-between group ${m.position ? 'border-blue-200 bg-blue-50' : ''}`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className={`h-4 w-4 ${m.position ? 'text-blue-500' : 'text-slate-400'}`} />
                                    <span className="text-sm truncate font-medium">{"{{"}{m.placeholder}{"}}"}</span>
                                </div>
                                {m.position ? (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeItemPosition(m.placeholder)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => placeOnCurrentPage(m.placeholder)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content - PDF Viewer */}
                <div className="flex-1 bg-slate-200 overflow-auto p-8 flex flex-col items-center gap-4" ref={containerRef}>
                    <div className="flex items-center gap-4 mb-4 bg-white p-2 rounded-full shadow-sm border px-6">
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

                    <div className="relative shadow-2xl bg-white">
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
                                        .filter(m => m.position?.page === pageNumber)
                                        .map(m => (
                                            <div
                                                key={m.placeholder}
                                                className="absolute pointer-events-auto cursor-move"
                                                style={{
                                                    left: `${m.position!.x}%`,
                                                    top: `${m.position!.y}%`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                                onMouseDown={(e) => {
                                                    // Simple drag implementation for custom x/y percentages
                                                    const startX = e.clientX;
                                                    const startY = e.clientY;
                                                    const initialX = m.position!.x;
                                                    const initialY = m.position!.y;
                                                    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();

                                                    const onMouseMove = (moveEvent: MouseEvent) => {
                                                        const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
                                                        const dy = ((moveEvent.clientY - startY) / rect.height) * 100;

                                                        setLocalMappings(prev => prev.map(item =>
                                                            item.placeholder === m.placeholder
                                                                ? { ...item, position: { ...item.position!, x: Math.max(0, Math.min(100, initialX + dx)), y: Math.max(0, Math.min(100, initialY + dy)) } }
                                                                : item
                                                        ));
                                                    };

                                                    const onMouseUp = () => {
                                                        document.removeEventListener('mousemove', onMouseMove);
                                                        document.removeEventListener('mouseup', onMouseUp);
                                                    };

                                                    document.addEventListener('mousemove', onMouseMove);
                                                    document.addEventListener('mouseup', onMouseUp);
                                                }}
                                            >
                                                <div className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow-md whitespace-nowrap flex items-center gap-1">
                                                    <GripVertical className="h-3 w-3 opacity-50" />
                                                    {"{{"}{m.placeholder}{"}}"}
                                                </div>
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

function FileText({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
        </svg>
    )
}

function Plus({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14" /><path d="M12 5v14" />
        </svg>
    )
}
