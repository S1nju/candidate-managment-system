"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { SignaturePad } from "@/components/signing/signature-pad"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, X, PenTool, Download } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import useSWR from "swr"
import { Calendar, PenLine, Stamp, Type, CheckSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLanguage } from "@/context/language-context"

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(
  () => import("@/components/signing/pdf-viewer").then((mod) => mod.PDFViewer),
  { ssr: false }
)

const FIELD_TYPES = [
  {
    group: "Signatures & Stamps",
    fields: [
      { type: "signature", label: "Signature", icon: <PenLine className="h-4 w-4" /> },
    ],
  },
  // Keep other fields if needed, simplified for candidate contract
]

export default function SignCandidateContractPage({ params }: { params: Promise<{ id: string }> }) {
  useAuth({ middleware: "auth" })
  const { t } = useLanguage()

  // Unwrap params for Next.js 15+ if needed, or just use useParams()
  const unwrappedParams = React.use(params)
  const id = unwrappedParams.id

  const router = useRouter()
  const { toast } = useToast()

  // State for signatures
  const [signatures, setSignatures] = useState<Array<{
    type: "drawn" | "typed" | "stamp",
    value: string,
    placement: { x: number, y: number, page: number },
    style?: React.CSSProperties
  }>>([])

  const [draggingSignatureIdx, setDraggingSignatureIdx] = useState<number | null>(null)
  const [draggingField, setDraggingField] = useState<string | null>(null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showSavedSignatures, setShowSavedSignatures] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isRejecting, setIsRejecting] = useState(false)

  // Fetch Candidate
  const { data: candidate, error, isLoading } = useSWR(`/api/candidates/${id}`, () => axios.get(`/api/candidates/${id}`).then(res => res.data))

  // Fetch saved signatures
  const { data: sigData } = useSWR("/api/signatures", () => axios.get("/api/signatures").then(res => res.data))
  const savedSignatures = sigData?.data || []

  const [contractFile, setContractFile] = useState<string | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, string>>({})
  const [placeholders, setPlaceholders] = useState<any[]>([])

  // Generate/Get contract on load
  useEffect(() => {
    async function fetchContract() {
      setLoadingContract(true)
      try {
        const res = await axios.post(`/api/candidates/${id}/generate-contract`)
        const { is_signed: isSigned, file: filePath, preview_data, placeholders } = res.data

        setPreviewData(preview_data || {})
        setPlaceholders(placeholders || [])

        const downloadUrl = `${axios.defaults.baseURL}/api/contracts/${encodeURIComponent(filePath)}`
        setContractFile(downloadUrl)
      } catch (err) {
        console.error("Failed to get contract", err)
        toast({ title: "Error", description: "Could not load contract", variant: "destructive" })
      } finally {
        setLoadingContract(false)
      }
    }
    if (id) fetchContract()
  }, [id, toast])

  const pdfUrl = contractFile;

  const handleSave = async () => {
    if (signatures.length === 0) {
      toast({
        title: "Incomplete",
        description: "Please place a signature on the document.",
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
        ip_address: "127.0.0.1",
        user_agent: navigator.userAgent
      }

      await axios.post(`/api/candidates/${id}/sign-contract`, payload)

      toast({ title: "Success", description: "Contract signed successfully" })
      router.push(`/dashboard/candidates`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to sign contract",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await axios.post(`/api/candidates/${id}/reject-contract`, {
        reason: rejectReason
      })
      toast({ title: "Success", description: "Contract rejected" })
      router.push(`/dashboard/candidates`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reject contract",
        variant: "destructive",
      })
    } finally {
      setIsRejecting(false)
      setShowRejectDialog(false)
    }
  }

  const handleDownload = () => {
    if (!contractFile) return;
    const link = document.createElement('a');
    link.href = contractFile;
    link.download = `contract_${candidate?.name || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleAddSavedSignature = (sigValue: string) => {
    setSignatures(prev => [
      ...prev.filter(s => s.value !== ""),
      {
        type: "drawn",
        value: sigValue,
        placement: { x: 50, y: 50, page: currentPage }
      }
    ])
    setShowSavedSignatures(false)
    toast({
      title: "Signature added",
      description: "Drag the signature to position it on the document"
    })
  }

  const containerRef = useRef<HTMLDivElement>(null)

  // Drag logic
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

  if (isLoading) return <div className="p-10 text-center">{t("common.loading")}</div>
  if (error) return <div className="p-10 text-center text-red-500">{t("candidates.sign.loading_pdf")}</div>

  const isSigned = !!(candidate?.signature_id || candidate?.contract_status?.toLowerCase() === 'signed');

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-muted/10">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center justify-between bg-background shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{t("candidates.sign.title")}</h1>
            <p className="text-sm text-muted-foreground">{candidate?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {contractFile && (
            <Button variant="outline" onClick={handleDownload} type="button" className="text-blue-600 border-blue-200 hover:bg-blue-50">
              <Download className="mr-2 h-4 w-4" />
              {t("candidates.sign.download_pdf")}
            </Button>
          )}
          {!isSigned && (
            <Link href="/dashboard/signatures">
              <Button variant="outline" type="button">
                <PenTool className="mr-2 h-4 w-4" />
                {t("candidates.sign.my_signatures")}
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => setShowRejectDialog(true)} type="button" className="text-red-600 hover:text-red-700">
            <X className="mr-2 h-4 w-4" />
            {t("candidates.sign.reject")}
          </Button>
          {!isSigned && (
            <Button onClick={handleSave} disabled={signatures.length === 0 || isSaving} className="font-bold">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? t("candidates.sign.finalizing") : t("candidates.sign.finalize")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden relative">
        {/* PDF Viewer */}
        <div
          ref={containerRef}
          className="lg:col-span-4 border-r bg-muted/20 relative overflow-hidden flex flex-col items-center justify-center"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            if (draggingField === "signature") {
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                setSignatures(prev => [...prev, { type: "drawn", value: "", placement: { x, y, page: currentPage } }])
                setShowSignaturePad(true)
              }
            }
            setDraggingField(null)
          }}
        >
          {loadingContract && <div>{t("candidates.sign.loading_pdf")}</div>}

          {!loadingContract && pdfUrl && (
            <PDFViewer fileUrl={pdfUrl} onPageChange={setCurrentPage}>
              {!isSigned && placeholders.map((p, idx) => (
                p.position.page === currentPage && (
                  <div
                    key={`p-${idx}`}
                    className="absolute text-[12px] font-bold text-slate-800 whitespace-nowrap pointer-events-none"
                    style={{
                      left: `${p.position.x}%`,
                      top: `${p.position.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {previewData[p.placeholder] || ""}
                  </div>
                )
              ))}
              {signatures.map((sig, idx) => (
                sig.placement.page === currentPage && (
                  <div
                    key={`s-${idx}`}
                    className={`absolute border-4 border-emerald-500 border-dashed p-2 group z-50 ${draggingSignatureIdx === idx ? "cursor-grabbing ring-4 ring-emerald-500/80 bg-emerald-100/60" : isSigned ? "cursor-default" : "cursor-move"}`}
                    style={{ left: `${sig.placement.x}%`, top: `${sig.placement.y}%`, transform: 'translate(-50%, -50%)', userSelect: 'none', pointerEvents: isSigned ? 'none' : 'auto' }}
                    onMouseDown={e => { if (!isSigned) { e.preventDefault(); setDraggingSignatureIdx(idx); } }}
                  >
                    {sig.value ? (
                      <img src={sig.value} alt="Signature" className="pointer-events-none select-none" style={{ height: '64px', filter: 'none', fontWeight: 700 }} />
                    ) : (
                      <div className="text-emerald-500 font-bold whitespace-nowrap text-xs">Signature</div>
                    )}
                  </div>
                )
              ))}
            </PDFViewer>
          )}
        </div>

        {/* Sidebar */}
        {!isSigned && (
          <div className="hidden lg:block col-span-1 border-l bg-background p-4 shadow-xl z-20">
            <div className="font-bold text-xs text-muted-foreground mb-4 tracking-wider">{t("candidates.sign.fields")}</div>

            {/* Saved Signatures Section */}
            {savedSignatures.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-muted-foreground mb-2">{t("candidates.sign.saved_signatures")}</div>
                <Button
                  variant="outline"
                  className="w-full mb-2"
                  onClick={() => setShowSavedSignatures(true)}
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  {t("candidates.sign.use_saved")} ({savedSignatures.length})
                </Button>
              </div>
            )}

            {FIELD_TYPES.map((group, i) => (
              <div key={i} className="mb-6">
                {group.fields.map(field => (
                  <div
                    key={field.type}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg border bg-card hover:bg-accent/50 cursor-grab select-none transition-all shadow-sm hover:shadow-md mb-2"
                    onClick={() => {
                      if (field.type === "signature") setShowSignaturePad(true)
                    }}
                    draggable
                    onDragStart={() => setDraggingField(field.type)}
                  >
                    <div className="p-2 bg-primary/10 text-primary rounded-md">
                      {field.icon}
                    </div>
                    <span className="text-sm font-medium">{field.label}</span>
                  </div>
                ))}
              </div>
            ))}

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">{t("candidates.sign.instructions_title")}</p>
              <p>{t("candidates.sign.instructions_text")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Signature Pad Modal */}
      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-2xl p-6 relative w-full max-w-lg mx-4">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white" onClick={() => setShowSignaturePad(false)}>&times;</button>
            <div className="mb-4">
              <h2 className="text-xl font-bold">Create Signature</h2>
              <p className="text-muted-foreground text-sm">Draw or type your signature below</p>
            </div>
            <SignaturePad onSignatureCreate={(type, value) => {
              setSignatures(prev => {
                const filtered = prev.filter(s => s.value !== "")
                return [...filtered, { type, value, placement: { x: 50, y: 50, page: currentPage } }]
              })
              setShowSignaturePad(false)
            }} />
          </div>
        </div>
      )}

      {/* Saved Signatures Modal */}
      <Dialog open={showSavedSignatures} onOpenChange={setShowSavedSignatures}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("candidates.sign.modal.select_saved")}</DialogTitle>
            <DialogDescription>{t("candidates.sign.modal.choose_saved")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {savedSignatures.map((sig: any) => (
              <div
                key={sig.id}
                className="border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleAddSavedSignature(sig.value)}
              >
                <img src={sig.value} alt="Signature" className="w-full h-24 object-contain" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("candidates.sign.modal.reject_title")}</DialogTitle>
            <DialogDescription>{t("candidates.sign.modal.reject_desc")}</DialogDescription>
          </DialogHeader>
          <Input
            placeholder={t("candidates.sign.modal.reject_placeholder")}
            value={rejectReason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
              {isRejecting ? t("candidates.sign.modal.rejecting") : t("candidates.sign.modal.reject_confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
