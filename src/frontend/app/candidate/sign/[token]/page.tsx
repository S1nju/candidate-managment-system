"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { HandwrittenSignatureDialog } from "@/components/signing/handwritten-signature-dialog"
import { useLanguage } from "@/context/language-context"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, ChevronRight, PenLine, CheckSquare, Download } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"

// Dynamically import PDFViewer
const PDFViewer = dynamic(
    () => import("@/components/signing/pdf-viewer").then((mod) => mod.PDFViewer),
    { ssr: false }
)

export default function PublicSignContractPage() {
    const params = useParams()
    const token = params?.token as string
    const { toast } = useToast()
    const { t } = useLanguage()

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
        field_name?: string,
        label?: string | null,
        placement: { x: number, y: number, page: number, width?: number, height?: number }
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
                    title: t("public_sign.toasts.error"),
                    description: error.response?.data?.message || t("public_sign.invalid_link"),
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
        setCurrentPage(1)
        setNumPages(0)

        // Setup signature placeholders from layout — only candidate signature/initials boxes
        if (!current.candidate_signed) {
            const sigPlaceholders = (current.placeholders || []).filter((p: any) => {
                if (!p.position) return false
                if (p.source === 'static_signature') return false
                // Only show candidate-facing signature boxes
                if (p.field_name === 'signature' || p.field_name === 'initials' || p.field_name === 'text_input') return true
                return false
            })

            setSignatures(sigPlaceholders.map((p: any) => ({
                type: p.field_name === 'text_input' ? "text" : "drawn",
                value: "",
                placeholder_name: p.placeholder,
                field_name: p.field_name,
                label: p.label,
                placement: { x: p.position.x, y: p.position.y, page: p.position.page, width: p.position.width, height: p.position.height }
            })))
        } else {
            setSignatures([])
        }
    }, [activeContractId, contracts, token])

    // Handle "Read & Approve" click — marks the current page as read, no stamping
    const handleReadAndApprove = useCallback(() => {
        if (approvedPages.has(currentPage)) return

        setApprovedPages(prev => new Set([...prev, currentPage]))

        // Auto-advance to next page if not last
        if (currentPage < numPages) {
            // The PDFViewer controls its own page internally; we just track currentPage via onPageChange.
            // We need to trigger a page change. We'll use a ref-based approach via a custom event.
            window.dispatchEvent(new CustomEvent("pdf-next-page"))
        }
    }, [approvedPages, currentPage, numPages])

    const allPagesApproved = numPages > 0 && approvedPages.size >= numPages
    const isLastPage = currentPage === numPages && numPages > 0

    // Final submit — sends all initials stamps + signature placeholders
    const handleSubmit = async () => {
        // Check all layout signature placeholders are filled
        const unfilled = signatures.filter(s => !s.value.trim())
        if (unfilled.length > 0) {
            toast({ title: t("public_sign.toasts.incomplete"), description: t("public_sign.toasts.incomplete_desc"), variant: "destructive" })
            return
        }

        setIsSaving(true)
        try {
            const allSigs = signatures.map(s => ({
                type: s.type === "typed" || s.type === "text" ? "text" : "image",
                value: s.type === "text" ? s.value.trim() : s.value,
                placement: s.placement,
            }))

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

            toast({ title: t("public_sign.toasts.success"), description: t("public_sign.toasts.signed") })
            window.location.reload()
        } catch (error: any) {
            toast({ title: t("public_sign.toasts.error"), description: error.response?.data?.message || t("public_sign.toasts.sign_failed"), variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground text-sm">{t("public_sign.loading")}</p>
                </div>
            </div>
        )
    }

    const activeContract = contracts.find(c => c.id === activeContractId)

    const allOverlays = signatures

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <PenLine className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{t("public_sign.title")}</h1>
                        <p className="text-sm text-muted-foreground">{candidateName}</p>
                    </div>
                </div>

                {/* Progress indicator */}
                {!isCurrentSigned && !isFullySigned && numPages > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-gray-700">{approvedPages.size} / {numPages}</span>
                        <span>{t("public_sign.pages_approved")}</span>
                    </div>
                )}
            </header>

            <main className="flex-1 container mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[calc(100vh-73px)]">
                {/* Sidebar */}
                <div className="lg:col-span-3 space-y-3 overflow-y-auto">
                    {/* Contract list */}
                    {contracts.length > 1 && (
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wider">{t("public_sign.documents")}</h3>
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
                                {t("public_sign.how_to")}
                            </p>
                            <ol className="space-y-1 list-decimal list-inside text-xs leading-relaxed">
                                <li>{t("public_sign.step1")}</li>
                                <li>{t("public_sign.step2")}</li>
                                <li>{t("public_sign.step3")}</li>
                                <li>{t("public_sign.step4")}</li>
                            </ol>
                        </div>
                    )}

                    {/* Page approval progress */}
                    {!isCurrentSigned && !isFullySigned && numPages > 0 && (
                        <div className="bg-white rounded-xl border p-4 space-y-2">
                            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("public_sign.pages")}</h3>
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
                                {isFullySigned ? t("public_sign.all_signed") : t("public_sign.doc_signed")}
                            </p>
                            <p className="text-xs">
                                {isFullySigned ? t("public_sign.all_signed_desc") : t("public_sign.doc_signed_desc")}
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
                            {/* Render signature/initials placeholders */}
                            {allOverlays.map((overlay, idx) => (
                                overlay.placement?.page === currentPage && overlay.type === "text" ? (
                                    <div
                                        key={idx}
                                        className="absolute z-10 border-2 border-primary border-dashed bg-primary/10 flex items-center"
                                        style={{
                                            left: `${overlay.placement.x}%`,
                                            top: `${overlay.placement.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            width: `${overlay.placement.width ?? 30}%`,
                                            height: `${overlay.placement.height ?? 4}%`,
                                            minHeight: '28px',
                                        }}
                                    >
                                        <input
                                            type="text"
                                            value={overlay.value}
                                            maxLength={200}
                                            placeholder={overlay.label || t("public_sign.type_here")}
                                            onChange={e => {
                                                const value = e.target.value
                                                setSignatures(prev => prev.map((s, i) => i === idx ? { ...s, value } : s))
                                            }}
                                            className="w-full h-full bg-transparent px-2 text-sm font-semibold text-black placeholder:text-primary/70 placeholder:font-medium outline-none"
                                        />
                                    </div>
                                ) : overlay.placement?.page === currentPage && (
                                    <div
                                        key={idx}
                                        className="absolute border-2 border-primary border-dashed bg-primary/10 hover:bg-primary/20 cursor-pointer flex items-center justify-center transition-all p-1"
                                        style={{
                                            left: `${overlay.placement.x}%`,
                                            top: `${overlay.placement.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            width: '180px',
                                            height: '80px',
                                            zIndex: 10
                                        }}
                                        onClick={() => {
                                            setSigningSignatureIdx(idx)
                                            setShowSignaturePad(true)
                                        }}
                                        title={overlay.field_name === 'initials' ? t("public_sign.initial_here") : t("public_sign.sign_here")}
                                    >
                                        {overlay.value ? (
                                            <img src={overlay.value} alt={t("public_sign.signature")} className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="text-center">
                                                <div className="text-primary font-bold text-xs uppercase">
                                                    {overlay.field_name === 'initials' ? t("public_sign.initial_here") : t("public_sign.sign_here")}
                                                </div>
                                                <PenLine className="h-4 w-4 text-primary mx-auto mt-1 opacity-50" />
                                            </div>
                                        )}
                                    </div>
                                )
                            ))}
                        </PDFViewer>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            {t("public_sign.select_doc")}
                        </div>
                    )}

                    {/* Bottom action bar */}
                    {!isCurrentSigned && !isFullySigned && numPages > 0 && (
                        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {t("common.page_of").replace("{page}", String(currentPage)).replace("{total}", String(numPages))}
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
                                        {isSaving ? t("public_sign.signing") : t("public_sign.sign_contract")}
                                    </Button>
                                ) : (
                                    // Not last page or not all approved → Read & Approve
                                    <Button
                                        onClick={handleReadAndApprove}
                                        disabled={approvedPages.has(currentPage)}
                                        variant={approvedPages.has(currentPage) ? "outline" : "default"}
                                        className={`gap-2 px-6 ${!approvedPages.has(currentPage) ? '!bg-yellow-400 !text-black hover:!bg-yellow-500' : ''}`}
                                    >
                                        {approvedPages.has(currentPage) ? (
                                            <>
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                {t("public_sign.approved")}
                                            </>
                                        ) : (
                                            <>
                                                <ChevronRight className="h-4 w-4" />
                                                {t("public_sign.read_approve")}
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Handwritten signature / initials popin */}
            <HandwrittenSignatureDialog
                open={showSignaturePad}
                mode={signingSignatureIdx !== null && signatures[signingSignatureIdx]?.field_name === "initials" ? "initials" : "signature"}
                defaultText={candidateName}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowSignaturePad(false)
                        setSigningSignatureIdx(null)
                    }
                }}
                onConfirm={(dataUrl) => {
                    if (signingSignatureIdx !== null) {
                        const fieldName = signatures[signingSignatureIdx]?.field_name
                        // Remembered: reuse on every other empty zone of the same kind (signature / initials)
                        setSignatures(prev => prev.map((s, i) =>
                            i === signingSignatureIdx || (s.field_name === fieldName && !s.value)
                                ? { ...s, type: "drawn", value: dataUrl }
                                : s
                        ))
                    }
                    setShowSignaturePad(false)
                    setSigningSignatureIdx(null)
                }}
            />
        </div>
    )
}
