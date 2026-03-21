"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { SignaturePad } from "@/components/signing/signature-pad"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, ChevronRight, PenLine, CheckSquare, Download } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"

// Dynamically import PDFViewer
const PDFViewer = dynamic(
    () => import("@/components/signing/pdf-viewer").then((mod) => mod.PDFViewer),
    { ssr: false }
)

// A small initials stamp rendered as a canvas data URL
function makeInitialsStamp(name: string): string {
    const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3)

    const canvas = document.createElement("canvas")
    canvas.width = 120
    canvas.height = 44
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#1d4ed8"
    ctx.font = "bold 20px serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(initials, 60, 22)
    return canvas.toDataURL("image/jpeg", 0.92)
}

export default function PublicSignContractPage() {
    const params = useParams()
    const token = params?.token as string
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [candidateName, setCandidateName] = useState("")
    const [contracts, setContracts] = useState<any[]>([])
    const [activeContractId, setActiveContractId] = useState<number | null>(null)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)

    // Page tracking
    const [currentPage, setCurrentPage] = useState(1)
    const [numPages, setNumPages] = useState(0)

    // Per-page approval state: set of approved page numbers
    const [approvedPages, setApprovedPages] = useState<Set<number>>(new Set())

    // Signature placeholders from layout
    const [signatures, setSignatures] = useState<Array<{
        type: "drawn" | "typed" | "text",
        value: string,
        placeholder_name?: string,
        placement: { x: number, y: number, page: number }
    }>>([])

    // Initials stamps added per page approval (bottom-left and bottom-right)
    const [initialsStamps, setInitialsStamps] = useState<Array<{
        value: string,
        placement: { x: number, y: number, page: number }
    }>>([])

    // Signature modal for the final sign step
    const [showSignaturePad, setShowSignaturePad] = useState(false)
    const [signingSignatureIdx, setSigningSignatureIdx] = useState<number | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isFullySigned, setIsFullySigned] = useState(false)
    const [isCurrentSigned, setIsCurrentSigned] = useState(false)

    // Fetch Contract Data
    useEffect(() => {
        if (!token) return

        async function fetchData() {
            try {
                const res = await axios.get(`/api/public/candidate/${token}`)

                setCandidateName(res.data.candidate_name)
                setContracts(res.data.contracts)
                setIsFullySigned(res.data.is_fully_signed)

                if (res.data.contracts.length > 0) {
                    const active = res.data.contracts.find((c: any) => !c.candidate_signed)
                        || res.data.contracts[0]
                    setActiveContractId(active.id)
                    setIsCurrentSigned(active.candidate_signed)
                }
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.response?.data?.message || "Invalid or expired link.",
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [token, toast])

    // Update PDF and Placeholders when Active Contract Changes
    useEffect(() => {
        if (!activeContractId || contracts.length === 0) return

        const current = contracts.find(c => c.id === activeContractId)
        if (!current) return

        setIsCurrentSigned(current.candidate_signed)

        const url = `${axios.defaults.baseURL}/api/public/candidate/${token}/preview?contract_id=${activeContractId}`
        setPdfUrl(url)

        // Reset per-page state when switching contracts
        setApprovedPages(new Set())
        setInitialsStamps([])
        setCurrentPage(1)
        setNumPages(0)

        // Setup signature placeholders from layout — only candidate signature/initials boxes
        if (!current.candidate_signed) {
            const sigPlaceholders = (current.placeholders || []).filter((p: any) => {
                if (!p.position) return false
                if (p.source === 'static_signature') return false
                // Only show candidate-facing signature boxes
                if (p.field_name === 'signature' || p.field_name === 'initials') return true
                return false
            })

            setSignatures(sigPlaceholders.map((p: any) => ({
                type: "drawn",
                value: "",
                placeholder_name: p.placeholder,
                placement: { x: p.position.x, y: p.position.y, page: p.position.page }
            })))
        } else {
            setSignatures([])
        }
    }, [activeContractId, contracts, token])

    // Handle "Read & Approve" click — stamps initials on bottom-left and bottom-right of current page
    const handleReadAndApprove = useCallback(() => {
        if (approvedPages.has(currentPage)) return

        const stamp = makeInitialsStamp(candidateName || "?")

        setInitialsStamps(prev => [
            ...prev,
            // Bottom-left
            { value: stamp, placement: { x: 8, y: 94, page: currentPage } },
            // Bottom-right
            { value: stamp, placement: { x: 92, y: 94, page: currentPage } },
        ])

        setApprovedPages(prev => new Set([...prev, currentPage]))

        // Auto-advance to next page if not last
        if (currentPage < numPages) {
            // The PDFViewer controls its own page internally; we just track currentPage via onPageChange.
            // We need to trigger a page change. We'll use a ref-based approach via a custom event.
            window.dispatchEvent(new CustomEvent("pdf-next-page"))
        }
    }, [approvedPages, currentPage, numPages, candidateName])

    const allPagesApproved = numPages > 0 && approvedPages.size >= numPages
    const isLastPage = currentPage === numPages && numPages > 0

    // Final submit — sends all initials stamps + signature placeholders
    const handleSubmit = async () => {
        // Check all layout signature placeholders are filled
        const unfilled = signatures.filter(s => !s.value)
        if (unfilled.length > 0) {
            toast({ title: "Incomplete", description: "Please sign all signature fields.", variant: "destructive" })
            return
        }

        setIsSaving(true)
        try {
            const allSigs = [
                // Initials stamps from page approvals
                ...initialsStamps.map(s => ({
                    type: "image",
                    value: s.value,
                    placement: s.placement,
                })),
                // Layout signature placeholders
                ...signatures.map(s => ({
                    type: s.type === "typed" ? "text" : "image",
                    value: s.value,
                    placement: s.placement,
                })),
            ]

            await axios.post(`/api/public/candidate/${token}/sign`, {
                signatures: allSigs,
                form_contract_id: activeContractId,
                ip_address: "candidate",
                user_agent: navigator.userAgent
            }, {
                headers: {
                    "Accept": "application/json"
                }
            })

            toast({ title: "Success", description: "Contract signed successfully!" })
            window.location.reload()
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Failed to sign.", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground text-sm">Loading your contract...</p>
                </div>
            </div>
        )
    }

    const activeContract = contracts.find(c => c.id === activeContractId)

    // Combine layout signatures + initials stamps for overlay
    const allOverlays = [
        ...initialsStamps.map(s => ({ ...s, isInitials: true })),
        ...signatures.map(s => ({ ...s, isInitials: false })),
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <PenLine className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Contract Signing</h1>
                        <p className="text-sm text-muted-foreground">{candidateName}</p>
                    </div>
                </div>

                {/* Progress indicator */}
                {!isCurrentSigned && !isFullySigned && numPages > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-gray-700">{approvedPages.size} / {numPages}</span>
                        <span>pages approved</span>
                    </div>
                )}
            </header>

            <main className="flex-1 container mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[calc(100vh-73px)]">
                {/* Sidebar */}
                <div className="lg:col-span-3 space-y-3 overflow-y-auto">
                    {/* Contract list */}
                    {contracts.length > 1 && (
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">Documents</h3>
                            <div className="space-y-2">
                                {contracts.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => !isSaving && setActiveContractId(c.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${activeContractId === c.id ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'hover:bg-gray-50'}`}
                                    >
                                        <span className="text-sm font-medium">{c.name}</span>
                                        {c.candidate_signed
                                            ? <CheckSquare className="h-4 w-4 text-emerald-500" />
                                            : <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    {!isCurrentSigned && !isFullySigned && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                            <p className="font-semibold mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                How to sign
                            </p>
                            <ol className="space-y-1 list-decimal list-inside text-xs leading-relaxed">
                                <li>Read each page carefully</li>
                                <li>Click <strong>"Read & Approve"</strong> on each page</li>
                                <li>Your initials will be stamped on each approved page</li>
                                <li>On the last page, click <strong>"Sign"</strong> to finalize</li>
                            </ol>
                        </div>
                    )}

                    {/* Page approval progress */}
                    {!isCurrentSigned && !isFullySigned && numPages > 0 && (
                        <div className="bg-white rounded-xl border p-4 space-y-2">
                            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Pages</h3>
                            <div className="grid grid-cols-5 gap-1">
                                {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                                    <div
                                        key={page}
                                        className={`h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${approvedPages.has(page)
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                            : page === currentPage
                                                ? 'bg-primary/10 text-primary border border-primary'
                                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                                            }`}
                                    >
                                        {approvedPages.has(page) ? '✓' : page}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fully signed message */}
                    {(isFullySigned || isCurrentSigned) && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-800">
                            <p className="font-semibold mb-1 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                {isFullySigned ? "All Signed!" : "Document Signed"}
                            </p>
                            <p className="text-xs">
                                {isFullySigned
                                    ? "You have signed all required documents. The administration will review them shortly."
                                    : "You have signed this document successfully."
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* PDF Viewer Area */}
                <div className="lg:col-span-9 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                    {pdfUrl ? (
                        <PDFViewer
                            fileUrl={pdfUrl}
                            onPageChange={setCurrentPage}
                            onNumPagesChange={setNumPages}
                        >
                            {/* Render initials stamps and signature placeholders */}
                            {allOverlays.map((overlay, idx) => (
                                overlay.placement?.page === currentPage && (
                                    <div
                                        key={idx}
                                        className={overlay.isInitials
                                            ? "absolute pointer-events-none"
                                            : "absolute border-2 border-primary border-dashed bg-primary/10 hover:bg-primary/20 cursor-pointer flex items-center justify-center transition-all p-1"
                                        }
                                        style={{
                                            left: `${overlay.placement.x}%`,
                                            top: `${overlay.placement.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            width: overlay.isInitials ? '80px' : '180px',
                                            height: overlay.isInitials ? '36px' : '80px',
                                            zIndex: 10
                                        }}
                                        onClick={!overlay.isInitials ? () => {
                                            const sigIdx = signatures.findIndex(
                                                s => s.placement.x === overlay.placement.x && s.placement.y === overlay.placement.y && s.placement.page === overlay.placement.page
                                            )
                                            if (sigIdx >= 0) {
                                                setSigningSignatureIdx(sigIdx)
                                                setShowSignaturePad(true)
                                            }
                                        } : undefined}
                                    >
                                        {overlay.value ? (
                                            <img src={overlay.value} alt="Signature" className="max-h-full max-w-full object-contain" />
                                        ) : !overlay.isInitials ? (
                                            <div className="text-center">
                                                <div className="text-primary font-bold text-xs uppercase">Sign Here</div>
                                                <PenLine className="h-4 w-4 text-primary mx-auto mt-1 opacity-50" />
                                            </div>
                                        ) : null}
                                    </div>
                                )
                            ))}
                        </PDFViewer>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Select a document
                        </div>
                    )}

                    {/* Bottom action bar */}
                    {!isCurrentSigned && !isFullySigned && numPages > 0 && (
                        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Page <span className="font-semibold text-gray-800">{currentPage}</span> of <span className="font-semibold text-gray-800">{numPages}</span>
                            </p>

                            <div className="flex gap-3">
                                {isLastPage && allPagesApproved ? (
                                    // Last page + all approved → Show Sign button
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSaving}
                                        className="bg-emerald-600 hover:bg-emerald-700 gap-2 px-6"
                                    >
                                        <PenLine className="h-4 w-4" />
                                        {isSaving ? "Signing..." : "Sign Contract"}
                                    </Button>
                                ) : (
                                    // Not last page or not all approved → Read & Approve
                                    <Button
                                        onClick={handleReadAndApprove}
                                        disabled={approvedPages.has(currentPage)}
                                        variant={approvedPages.has(currentPage) ? "outline" : "default"}
                                        className={`gap-2 px-6 ${!approvedPages.has(currentPage) ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                    >
                                        {approvedPages.has(currentPage) ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                Approved
                                            </>
                                        ) : (
                                            <>
                                                <ChevronRight className="h-4 w-4" />
                                                Read & Approve
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Signature Pad Modal */}
            {showSignaturePad && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
                            onClick={() => {
                                setShowSignaturePad(false)
                                setSigningSignatureIdx(null)
                            }}
                        >
                            ✕
                        </button>
                        <div className="mb-6">
                            <h2 className="text-xl font-bold">Draw Your Signature</h2>
                            <p className="text-sm text-gray-500">Sign below to complete the document.</p>
                        </div>

                        <SignaturePad
                            onSignatureCreate={(type, value) => {
                                if (signingSignatureIdx !== null) {
                                    setSignatures(prev => prev.map((s, i) =>
                                        i === signingSignatureIdx ? { ...s, type, value } : s
                                    ))
                                }
                                setShowSignaturePad(false)
                                setSigningSignatureIdx(null)
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
