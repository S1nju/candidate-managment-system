"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { SignaturePad } from "@/components/signing/signature-pad"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Calendar, User, Type, CheckSquare, Mail, Briefcase, Building2, User2, UserCircle, PenLine, Stamp } from "lucide-react"

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(
    () => import("@/components/signing/pdf-viewer").then((mod) => mod.PDFViewer),
    { ssr: false }
)

// Field types for sidebar
const FIELD_TYPES = [
    {
        group: "Signatures & Stamps",
        fields: [
            { type: "signature", label: "Signature", icon: <PenLine className="h-4 w-4" /> },
            { type: "stamp", label: "Stamp", icon: <Stamp className="h-4 w-4" /> },
        ],
    },
    {
        group: "Other Fields",
        fields: [
            { type: "date", label: "Date Signed", icon: <Calendar className="h-4 w-4" /> },
            { type: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
            { type: "checkbox", label: "Checkbox", icon: <CheckSquare className="h-4 w-4" /> },
        ],
    },
]

export default function SignDocumentPage() {
    useAuth({ middleware: "auth" })

    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()
    const documentId = params.id as string

    // State for signature and initials overlays
    const [signature, setSignature] = useState<{ type: "drawn" | "typed", value: string } | null>(null)
    const [signaturePlacement, setSignaturePlacement] = useState<{ x: number, y: number, page: number } | null>(null)
    const [signatures, setSignatures] = useState<Array<{
        type: "drawn" | "typed" | "stamp",
        value: string,
        placement: { x: number, y: number, page: number },
        style?: React.CSSProperties
    }>>([])
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [isDragging, setIsDragging] = useState<null | "signature" | "initials">(null)
    const [isSaving, setIsSaving] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    // Drag state for multi-signature overlays
    const [draggingSignatureIdx, setDraggingSignatureIdx] = useState<number | null>(null)
    // Add a new state for date overlays
    const [dateOverlays, setDateOverlays] = useState<Array<{ value: string, placement: { x: number, y: number, page: number } }>>([])
    // Drag state for date overlays
    const [draggingDateIdx, setDraggingDateIdx] = useState<number | null>(null)
    // Drag state for sidebar fields
    const [draggingField, setDraggingField] = useState<string | null>(null)
    const [showSignaturePad, setShowSignaturePad] = useState(false)
    const [showStampModal, setShowStampModal] = useState(false);
    const [stamps, setStamps] = useState<Array<{ id: string, url: string }>>([]); // fetched from server
    const [selectedStamp, setSelectedStamp] = useState<string | null>(null);

    // For demo purposes, using a placeholder PDF URL
    // In production, this would fetch the actual document URL from the backend
    const pdfUrl = `http://localhost:8000/api/documents/${documentId}/preview`

    // Fetch document status for security
    const { data: docData, isLoading: docLoading } = useSWR(`/api/documents/${documentId}`, () => axios.get(`/api/documents/${documentId}`).then(res => res.data))
    // Fetch saved signatures
    const { data: sigData } = useSWR("/api/signatures", () => axios.get("/api/signatures").then(res => res.data))
    const savedSignatures = sigData?.data || []

    // Add signature overlay
    const handleSignatureCreate = (type: "drawn" | "typed", value: string) => {
        setSignatures(prev => [...prev, { type, value, placement: { x: 50, y: 50, page: currentPage } }])
        toast({
            title: "Signature created",
            description: "Drag the signature on the document to position it",
        })
    }

    // Add saved signature overlay
    const handleAddSavedSignature = (sigValue: string) => {
        setSignatures(prev => [
            ...prev,
            {
                type: "drawn",
                value: sigValue,
                placement: { x: 50, y: 50, page: currentPage },
                // Add a style override for larger, bolder signature
                style: { height: '64px', filter: 'none', fontWeight: 700, fontSize: '2.5rem' }
            }
        ]);
        toast({ title: "Signature added", description: "Drag the signature on the document to position it" });
    }

    // Add saved stamp overlay
    const handleAddSavedStamp = (stampUrl: string) => {
        setSignatures(prev => [...prev, { type: "stamp", value: stampUrl, placement: { x: 50, y: 50, page: currentPage } }]);
        toast({ title: "Stamp added", description: "Drag the stamp on the document to position it" });
    }

    const handleSave = async () => {
        if (signatures.length === 0 && dateOverlays.length === 0) {
            toast({
                title: "Incomplete",
                description: "Please add and place at least one signature or date",
                variant: "destructive",
            })
            return
        }

        setIsSaving(true)

        try {
            const payload = {
                signatures: signatures.map(sig => ({
                    type: sig.type === "typed" ? "text" : "image",
                    value: sig.value,
                    placement: sig.placement,
                })),
                dates: dateOverlays.map(d => ({
                    value: d.value,
                    placement: d.placement,
                })),
                date,
            };
            console.log('Signing payload:', payload)
            await axios.post(`/api/documents/${documentId}/sign`, payload)

            toast({
                title: "Success",
                description: "Document signed successfully",
            })

            router.push("/dashboard/documents")
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to sign document",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging("signature")
    }

    // Refs for latest placement state
    const signaturePlacementRef = useRef(signaturePlacement)
    useEffect(() => { signaturePlacementRef.current = signaturePlacement }, [signaturePlacement])

    // Refactor drag logic for multiple signatures
    useEffect(() => {
        if (draggingSignatureIdx === null) return
        const handleMove = (e: MouseEvent) => {
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * 100
            const y = ((e.clientY - rect.top) / rect.height) * 100
            const clampedX = Math.max(0, Math.min(100, x))
            const clampedY = Math.max(0, Math.min(100, y))
            setSignatures(prev => prev.map((sig, idx) =>
                idx === draggingSignatureIdx ? { ...sig, placement: { ...sig.placement, x: clampedX, y: clampedY } } : sig
            ))
        }
        const handleUp = () => setDraggingSignatureIdx(null)
        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", handleUp)
        return () => {
            window.removeEventListener("mousemove", handleMove)
            window.removeEventListener("mouseup", handleUp)
        }
    }, [draggingSignatureIdx])

    // Add drag logic for date overlays
    useEffect(() => {
        if (draggingDateIdx === null) return;
        const handleMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            const clampedX = Math.max(0, Math.min(100, x));
            const clampedY = Math.max(0, Math.min(100, y));
            setDateOverlays(prev => prev.map((d, idx) =>
                idx === draggingDateIdx ? { ...d, placement: { ...d.placement, x: clampedX, y: clampedY } } : d
            ));
        };
        const handleUp = () => setDraggingDateIdx(null);
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [draggingDateIdx])

    const containerRef = React.useRef<HTMLDivElement>(null)

    // Secure: block if already signed
    if (docLoading) return <div>Loading...</div>
    if (docData?.status === "signed") {
        return <div className="p-8 text-center text-red-600 font-bold">This document is already signed and cannot be signed again.</div>
    }

    return (
        <div className="h-screen flex flex-col pt-16 bg-muted/10">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between bg-background fixed top-0 w-full z-10 h-16 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard/documents")}
                        type="button"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold">Sign Document</h1>
                        <p className="text-sm text-muted-foreground">Document ID: {documentId}</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden">
                {/* PDF Viewer */}
                <div
                    ref={containerRef}
                    className="lg:col-span-4 border-r bg-muted/20 relative overflow-hidden flex flex-col"
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={e => {
                        if (!draggingField) return;
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        if (draggingField === "signature") {
                            setSignatures(prev => [...prev, { type: "drawn", value: "", placement: { x, y, page: currentPage } }]);
                        } else if (draggingField === "date") {
                            setDateOverlays(prev => [...prev, { value: date, placement: { x, y, page: currentPage } }]);
                        }
                        setDraggingField(null);
                    }}
                >
                    {/* Save Button absolutely positioned at top right */}
                    <div className="hidden lg:block absolute top-4 right-4 z-50">
                        <Button
                            onClick={handleSave}
                            disabled={signatures.length === 0 || isSaving}
                            className="py-3 px-6 text-base font-bold shadow-lg"
                        >
                            <Save className="mr-2 h-5 w-5" />
                            {isSaving ? "Saving..." : "Finalize & Save Signatures"}
                        </Button>
                    </div>
                    <PDFViewer
                        fileUrl={pdfUrl}
                        onPageChange={(page) => setCurrentPage(page)}
                    >
                        {signatures.map((sig, idx) => (
                            sig.placement.page === currentPage && (
                                <div
                                    key={"sig-" + idx}
                                    className={`absolute border-4 border-red-500 border-dashed p-2 group z-9999 ${draggingSignatureIdx === idx ? "cursor-grabbing ring-4 ring-red-500/80 bg-red-100/60" : "cursor-move"}`}
                                    style={{ left: `${sig.placement.x}%`, top: `${sig.placement.y}%`, transform: 'translate(-50%, -50%)', userSelect: 'none', pointerEvents: 'auto' }}
                                    onMouseDown={e => { e.preventDefault(); setDraggingSignatureIdx(idx) }}
                                >
                                    {sig.type === "drawn" ? (
                                        <img src={sig.value} alt="Signature" className="pointer-events-none select-none" style={sig.style || { height: '64px', filter: 'none', fontWeight: 700 }} />
                                    ) : sig.type === "typed" ? (
                                        <div className="text-2xl px-3 py-1 pointer-events-none select-none text-black whitespace-nowrap" style={{ fontFamily: "'Dancing Script', 'Pacifico', cursive", fontWeight: 700, fontSize: '2.5rem' }}>{sig.value}</div>
                                    ) : sig.type === "stamp" ? (
                                        <img src={sig.value} alt="Stamp" className="h-16 w-auto pointer-events-none select-none" />
                                    ) : null}
                                </div>
                            )
                        ))}
                        {dateOverlays.map((d, idx) => (
                            d.placement.page === currentPage && (
                                <div
                                    key={"date-" + idx}
                                    className={`absolute border-4 border-blue-500 border-dashed p-2 group z-9999 ${draggingDateIdx === idx ? "cursor-grabbing ring-4 ring-blue-500/80 bg-blue-100/60" : "cursor-move"}`}
                                    style={{ left: `${d.placement.x}%`, top: `${d.placement.y}%`, transform: 'translate(-50%, -50%)', userSelect: 'none', pointerEvents: 'auto' }}
                                    onMouseDown={e => { e.preventDefault(); setDraggingDateIdx(idx) }}
                                >
                                    <div className="text-lg px-3 py-1 pointer-events-none select-none text-blue-900 whitespace-nowrap font-mono bg-white/80 rounded shadow">
                                        {d.value}
                                    </div>
                                </div>
                            )
                        ))}
                    </PDFViewer>
                </div>
                {/* Sidebar Fields Panel (right) */}
                <div className="hidden lg:block col-span-1 border-l bg-background/90 p-4 min-w-45 max-w-55">
                    <div className="font-bold text-xs text-muted-foreground mb-2">FIELDS</div>
                    {FIELD_TYPES.map((group, gidx) => (
                        <div key={gidx} className="mb-4">
                            {group.group && <div className="text-xs font-bold text-muted-foreground mb-2">{group.group}</div>}
                            {group.fields.map(field => (
                                <div
                                    key={field.type}
                                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-grab select-none"
                                    draggable
                                    onDragStart={() => setDraggingField(field.type)}
                                    onDragEnd={() => setDraggingField(null)}
                                    onClick={() => {
                                        if (field.type === "signature") setShowSignaturePad(true);
                                        if (field.type === "stamp") setShowStampModal(true);
                                    }}
                                >
                                    {field.icon}
                                    <span className="text-sm">{field.label}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                    {/* Saved Signatures */}
                    {savedSignatures.length > 0 && (
                        <div className="mt-8">
                            <div className="text-xs font-bold text-muted-foreground mb-2">Saved Signatures</div>
                            <div className="flex flex-col gap-2">
                                {savedSignatures.map((sig: any, idx: number) => (
                                    <button
                                        key={idx}
                                        className="flex items-center gap-2 px-2 py-2 rounded border hover:bg-muted cursor-pointer"
                                        onClick={() => handleAddSavedSignature(sig.value)}
                                    >
                                        <img src={sig.value} alt="Saved Signature" className="h-8 w-auto grayscale contrast-125 brightness-90" />
                                        <span className="text-xs">Signature {idx + 1}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Saved Stamps */}
                    {stamps.length > 0 && (
                        <div className="mt-8">
                            <div className="text-xs font-bold text-muted-foreground mb-2">Saved Stamps</div>
                            <div className="flex flex-col gap-2">
                                {stamps.map((stamp, idx) => (
                                    <button
                                        key={stamp.id}
                                        className="flex items-center gap-2 px-2 py-2 rounded border hover:bg-muted cursor-pointer"
                                        onClick={() => handleAddSavedStamp(stamp.url)}
                                    >
                                        <img src={stamp.url} alt="Saved Stamp" className="h-8 w-auto" />
                                        <span className="text-xs">Stamp {idx + 1}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Render SignaturePad as modal overlay */}
            {showSignaturePad && (
                <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-lg p-6 relative">
                        <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => setShowSignaturePad(false)}>&times;</button>
                        <SignaturePad
                            onSignatureCreate={(type, value) => {
                                setSignatures(prev => [...prev, { type, value, placement: { x: 50, y: 50, page: currentPage } }]);
                                setShowSignaturePad(false);
                                toast({ title: "Signature created", description: "Drag the signature on the document to position it" });
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Render Stamp Modal */}
            {showStampModal && (
                <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 relative w-100 max-w-full transition-colors">
                        <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => setShowStampModal(false)}>&times;</button>
                        <h2 className="text-lg font-bold mb-4">Select or Upload Stamp</h2>
                        <input type="file" accept="image/*" onChange={async e => {
                            if (e.target.files && e.target.files[0]) {
                                // Upload to server (simulate for now)
                                const formData = new FormData();
                                formData.append('stamp', e.target.files[0]);
                                // TODO: POST to /api/stamps, get new stamp URL
                                // For now, simulate:
                                const url = URL.createObjectURL(e.target.files[0]);
                                setStamps(prev => [...prev, { id: Date.now().toString(), url }]);
                            }
                        }} />
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {stamps.map(stamp => (
                                <img
                                    key={stamp.id}
                                    src={stamp.url}
                                    alt="Stamp"
                                    className={`border-2 rounded cursor-pointer ${selectedStamp === stamp.id ? 'border-blue-500' : 'border-gray-200'}`}
                                    onClick={() => setSelectedStamp(stamp.id)}
                                />
                            ))}
                        </div>
                        <Button
                            className="mt-4 w-full"
                            disabled={!selectedStamp}
                            onClick={() => {
                                const stamp = stamps.find(s => s.id === selectedStamp);
                                if (stamp) {
                                    setSignatures(prev => [...prev, { type: "stamp", value: stamp.url, placement: { x: 50, y: 50, page: currentPage } }]);
                                    setShowStampModal(false);
                                    setSelectedStamp(null);
                                    toast({ title: "Stamp added", description: "Drag the stamp on the document to position it" });
                                }
                            }}
                        >Add Stamp to Document</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
