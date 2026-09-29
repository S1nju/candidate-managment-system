"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, X, Download, Shield } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import useSWR from "swr"
import { CheckSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import echo from "@/lib/echo"
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
import { getCandidateDisplayName } from "@/lib/candidate-name"

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(
  () => import("@/components/signing/pdf-viewer").then((mod) => mod.PDFViewer),
  { ssr: false }
)

const DEFAULT_STAMP_WIDTH = 20

export default function SignCandidateContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth({ middleware: "auth" })
  const { t } = useLanguage()

  const unwrappedParams = React.use(params)
  const id = unwrappedParams.id

  const router = useRouter()
  const { toast } = useToast()

  // --- PRE-LOAD STATE ---
  const [isVerifyingAvailability, setIsVerifyingAvailability] = useState(true)
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'locked' | 'signed' | null>(null)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [isReadyToLoad, setIsReadyToLoad] = useState(false)

  // State for signatures
  const [signatures, setSignatures] = useState<Array<{
    type: "drawn" | "typed" | "stamp" | "text" | "date",
    value: string,
    placeholder_name?: string,
    field_name?: string,
    placement: { x: number, y: number, page: number, width?: number, height?: number },
    style?: React.CSSProperties
  }>>([])

  const [draggingSignatureIdx, setDraggingSignatureIdx] = useState<number | null>(null)
  // Empty box the stamp dialog was opened for (survives the mouseup that ends the click)
  const [stampTargetIdx, setStampTargetIdx] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showSavedSignatures, setShowSavedSignatures] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isRejecting, setIsRejecting] = useState(false)
  const [signingStatus, setSigningStatus] = useState<any>(null)
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const lockingSessionId = useRef<string>(Math.random().toString(36).substring(2, 11) + Date.now().toString(36)).current

  // --- MULTI-CONTRACT STATE ---
  const [contracts, setContracts] = useState<any[]>([])
  const [activeContractId, setActiveContractId] = useState<number | null>(null)

  // Fetch Candidate - ONLY LOAD IF READY
  const { data: candidate, error, isLoading, mutate } = useSWR(isReadyToLoad ? `/api/candidates/${id}` : null, () => axios.get(`/api/candidates/${id}`).then(res => res.data))

  // Fetch saved signatures - ONLY LOAD IF READY
  const { data: sigData } = useSWR(isReadyToLoad ? "/api/signatures" : null, () => axios.get("/api/signatures").then(res => res.data))
  const savedSignatures = sigData?.data || []

  // STAGE 1: VERIFY AVAILABILITY BEFORE DOING ANYTHING ELSE
  useEffect(() => {
    if (!id || !user) return

    const verifyAvailability = async () => {
      try {
        const res = await axios.get(`/api/candidates/${id}/signing-status`)
        const status = res.data.status
        const locker = res.data.locked_by

        setAvailabilityStatus(status)
        setLockedBy(locker)

        // CRITICAL LOGIC: If it's available, signed, or locked by ME, we proceed to load
        if (status === 'available' || status === 'signed' || (status === 'locked' && locker === user.name)) {
          setIsReadyToLoad(true)
        }
      } catch (error) {
        console.error("Verification failed", error)
      } finally {
        setIsVerifyingAvailability(false)
      }
    }

    verifyAvailability()
  }, [id, user])

  const acquireLock = async () => {
    try {
      await axios.post(`/api/candidates/${id}/acquire-lock`, { session_id: lockingSessionId })
    } catch (error: any) {
      // Handled in checkStatus or UI block
    }
  }

  const releaseLock = async () => {
    try {
      await axios.post(`/api/candidates/${id}/release-lock`, { session_id: lockingSessionId })
    } catch (error) {
      console.error("Failed to release lock", error)
    }
  }

  const checkStatus = async () => {
    try {
      const res = await axios.get(`/api/candidates/${id}/signing-status`)
      setSigningStatus(res.data)
      setAvailabilityStatus(res.data.status)
      setLockedBy(res.data.locked_by)

      // If it becomes available or signed while we are waiting on the busy screen
      if ((res.data.status === 'available' || res.data.status === 'signed') && !isReadyToLoad) {
        setIsReadyToLoad(true)
      }
    } catch (error) {
      console.error('Failed to check signing status', error)
    }
  }

  const sendPing = async () => {
    try {
      await axios.post(`/api/candidates/${id}/ping`, { session_id: lockingSessionId })
    } catch (e) {
      console.error("Heartbeat failed", e)
    }
  }

  // STAGE 2: ACTIVATE WEBSOCKETS AND LOCKING ONLY IF READY
  useEffect(() => {
    if (!id || !user || !isReadyToLoad) return

    // Attempt to acquire lock immediately
    acquireLock()
    checkStatus()
    sendPing()

    const pingInterval = setInterval(sendPing, 10000)

    if (!echo) {
      // Fallback polling if echo is unavailable
      const pollInterval = setInterval(checkStatus, 5000)
      return () => {
        clearInterval(pingInterval)
        clearInterval(pollInterval)
        releaseLock()
      }
    }

    const channel = echo.join(`candidates.${id}.signing`)
      .here((users: any[]) => {
        const uniqueUsers = users.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        setActiveUsers(uniqueUsers)
      })
      .joining((u: any) => {
        setActiveUsers((prev) => {
          const exists = prev.find(p => p.id === u.id);
          return exists ? prev : [...prev, u];
        })
        if (u.id !== user?.id) checkStatus()
      })
      .leaving((u: any) => {
        setActiveUsers((prev) => prev.filter(p => p.id !== u.id))
        if (u.id !== user?.id) checkStatus()
      })

    const handleBeforeUnload = () => {
      const url = `${axios.defaults.baseURL}/api/candidates/${id}/release-lock`;
      const data = new FormData();
      data.append('session_id', lockingSessionId);
      navigator.sendBeacon(url, data);
    }
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(pingInterval)
      if (echo) echo.leave(`candidates.${id}.signing`)
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseLock()
    }
  }, [id, user?.id, isReadyToLoad])

  const [contractFile, setContractFile] = useState<string | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, string>>({})
  const [placeholders, setPlaceholders] = useState<any[]>([])

  // Generate/Get contract on load - ONLY IF READY
  useEffect(() => {
    if (!id || !isReadyToLoad) return

    async function fetchContract() {
      setLoadingContract(true)
      try {
        const res = await axios.post(`/api/candidates/${id}/generate-contract`)
        // Support both old and new format for transition
        const contractsList = res.data.contracts || [
          { id: 99999, name: 'Contract', template_path: res.data.file, preview_data: res.data.preview_data, placeholders: res.data.placeholders, status: res.data.is_signed ? 'signed' : 'pending' }
        ];

        setContracts(contractsList);

        // If no active contract selected yet, select the first pending or first one
        if (activeContractId === null && contractsList.length > 0) {
          const firstPending = contractsList.find((c: any) => c.status === 'pending') || contractsList[0];
          setActiveContractId(firstPending.id);
        }

      } catch (err) {
        console.error("Failed to get contract", err)
        toast({ title: t("common.error"), description: t("candidates.sign.toasts.load_failed"), variant: "destructive" })
      } finally {
        setLoadingContract(false)
      }
    }
    fetchContract()
  }, [id, isReadyToLoad, toast])

  // Effect to update preview when active contract changes
  useEffect(() => {
    if (!activeContractId || contracts.length === 0) return;

    const current = contracts.find(c => c.id === activeContractId);
    if (!current) return;

    setPreviewData(current.preview_data || {})
    setPlaceholders(current.placeholders || [])

    // Determine PDF URL
    const downloadUrl = `${axios.defaults.baseURL}/api/candidates/${id}/preview-contract?contract_id=${activeContractId}`
    setContractFile(downloadUrl)

    // Auto-place signatures based on placeholders — admin only sees admin_signature boxes
    const sigPlaceholders = (current.placeholders || []).filter((p: any) => {
      if (!p.position) return false;
      if (p.source === 'static_signature') return false;

      // Only show admin_signature placeholders on the admin signing page
      if (p.field_name === 'admin_signature') return true;

      return false;
    })

    if (sigPlaceholders.length > 0) {
      setSignatures(sigPlaceholders.map((p: any) => ({
        type: "drawn",
        value: "",
        placeholder_name: p.placeholder, // Track which placeholder this is for
        field_name: p.field_name, // Track type (signature vs initials)
        placement: {
          x: p.position.x,
          y: p.position.y,
          page: p.position.page,
          width: p.position.width,
          height: p.position.height
        }
      })))
    } else {
      setSignatures([])
    }

  }, [activeContractId, contracts, id])

  const pdfUrl = contractFile;

  const handleSave = async () => {
    if (signatures.length === 0 || signatures.some(s => !s.value)) {
      toast({ title: t("candidates.sign.toasts.incomplete"), description: t("candidates.sign.toasts.incomplete_desc"), variant: "destructive" })
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
        session_id: lockingSessionId,
        form_contract_id: activeContractId,
        ip_address: "localhost",
        user_agent: navigator.userAgent
      }

      await axios.post(`/api/candidates/${id}/sign-contract`, payload, {
        headers: {
          "Accept": "application/json"
        }
      })
      toast({ title: t("candidates.sign.toasts.success"), description: t("candidates.sign.toasts.signed") })
      router.push(`/dashboard/candidates`)
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast({ title: t("candidates.sign.toasts.locked"), description: error.response.data.message, variant: "destructive" })
      } else {
        toast({ title: t("common.error"), description: error.response?.data?.message || t("candidates.sign.toasts.sign_failed"), variant: "destructive" })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await axios.post(`/api/candidates/${id}/reject-contract`, { reason: rejectReason })
      toast({ title: t("candidates.sign.toasts.success"), description: t("candidates.sign.toasts.rejected") })
      router.push(`/dashboard/candidates`)
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.response?.data?.message || t("candidates.sign.toasts.reject_failed"), variant: "destructive" })
    } finally {
      setIsRejecting(false)
      setShowRejectDialog(false)
    }
  }

  const handleDownload = () => {
    if (!contractFile) return;
    const link = document.createElement('a');
    link.href = contractFile;
    link.download = `contract_${(candidate && getCandidateDisplayName(candidate)) || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleAddSavedSignature = (sigValue: string) => {
    const targetIdx = stampTargetIdx
    setSignatures(prev => {
      // A specific empty box was clicked: stamp that one only
      if (targetIdx !== null && prev[targetIdx]) {
        return prev.map((s, i) => i === targetIdx ? { ...s, value: sigValue, type: "drawn" } : s);
      }
      // Otherwise fill the empty boxes
      const hasPlaceholders = prev.some(s => s.value === "");
      if (hasPlaceholders) {
        return prev.map(s => s.value === "" ? { ...s, value: sigValue, type: "drawn" } : s);
      }
      // Otherwise fallback to adding a new one (normal behavior)
      return [
        ...prev,
        { type: "drawn", value: sigValue, placement: { x: 50, y: 50, page: currentPage } }
      ]
    })
    setShowSavedSignatures(false)
    setStampTargetIdx(null)
    toast({ title: t("candidates.sign.toasts.stamp_added"), description: t("candidates.sign.toasts.position_confirmed") })
  }

  const containerRef = useRef<HTMLDivElement>(null)

  // Resize a stamp from its corner handle. Width is a % of the page, kept centred on (x, y) like the PDF generator.
  const startResize = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = e.clientX
    const startWidth = signatures[idx]?.placement.width ?? DEFAULT_STAMP_WIDTH
    const move = (ev: MouseEvent) => {
      const width = Math.max(5, Math.min(80, startWidth + (((ev.clientX - startX) * 2) / rect.width) * 100))
      setSignatures(prev => prev.map((s, i) => i === idx ? { ...s, placement: { ...s.placement, width } } : s))
    }
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  // Drag logic
  useEffect(() => {
    if (draggingSignatureIdx === null) return
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
      setSignatures(prev => prev.map((sig, idx) =>
        idx === draggingSignatureIdx ? { ...sig, placement: { ...sig.placement, x, y } } : sig
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

  // --- UI RENDERING ---

  // 1. Initial Verification Loader
  if (isVerifyingAvailability || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-muted/30 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-medium">{t("candidates.sign.verifying")}</p>
      </div>
    )
  }

  // 2. Already Signed Overlay
  if (availabilityStatus === 'signed' && !isLoading && candidate?.contract_status === 'signed') {
    // Optional: Could also just let them in with isSigned=true
  }

  // 3. Busy Overlay (Only if NOT ready to load)
  if (!isReadyToLoad && availabilityStatus === 'locked' && lockedBy !== user.name) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 p-6 text-center">
        <div className="bg-card p-8 rounded-xl shadow-lg max-w-md border border-yellow-200 dark:border-yellow-900/50">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("candidates.sign.busy_title")}</h2>
          <p className="text-muted-foreground mb-6">
            <strong>{lockedBy}</strong> is currently signing this contract.
            To prevent errors, you cannot enter this page until they finish or leave the page.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3 mb-6 flex items-center justify-center gap-2 text-yellow-700 dark:text-yellow-500 font-medium border border-yellow-100 dark:border-yellow-900/20 text-xs">
            <span>{t("candidates.sign.busy_realtime")}</span>
          </div>

          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              {t("candidates.sign.busy_check")}
            </Button>
            <Button onClick={() => router.push('/dashboard/candidates')} variant="link" className="w-full">
              {t("candidates.sign.busy_back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Main Signing UI (Loading State)
  if (isLoading || !candidate) return <div className="p-10 text-center">{t("common.loading")}</div>
  if (error) return <div className="p-10 text-center text-red-500">{t("candidates.sign.loading_pdf")}</div>

  // 5. Rejected Overlay
  if (candidate?.contract_status === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 p-6 text-center">
        <div className="bg-card p-8 rounded-xl shadow-lg max-w-md border border-red-200 dark:border-red-900/50">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("candidates.sign.rejected_title")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("candidates.sign.rejected_desc")}
          </p>
          {candidate.data?.rejection_reason && (
            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 mb-6 text-left text-sm text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/20">
              <span className="font-semibold block mb-1">{t("candidates.sign.rejected_reason")}</span>
              {candidate.data.rejection_reason}
            </div>
          )}
          <Button onClick={() => router.push('/dashboard/candidates')} variant="outline" className="w-full">
            {t("candidates.sign.back_to_candidates")}
          </Button>
        </div>
      </div>
    )
  }

  const isGlobalSigned = !!(candidate?.contract_status?.toLowerCase() === 'signed');
  const activeContract = contracts.find(c => c.id === activeContractId);
  // If global is signed, treat everything as signed (legacy support + strictly read-only)
  const isContractSigned = isGlobalSigned || (activeContract ? activeContract.status === 'signed' : false);

  return (
    <div className="h-full flex flex-col bg-muted/10">
      {/* Header */}
      <div className=" px-6 py-3 flex items-center justify-between bg-background  top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              {t("candidates.sign.title")}
              {isGlobalSigned && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  {t("candidates.detail.contract_signed")}
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">{candidate ? getCandidateDisplayName(candidate) : ""}</p>
          </div>
          {activeUsers.filter(u => u.id !== user?.id).length > 0 && (
            <div className="flex -space-x-2 overflow-hidden ml-4 items-center">
              <span className="text-[10px] text-muted-foreground mr-2 font-medium">{t("candidates.sign.other_signers")}</span>
              {activeUsers.filter(u => u.id !== user?.id).map((u, i) => (
                <div key={i} title={u.name} className="inline-block h-6 w-6 text-center rounded-full ring-2 ring-background bg-muted text-foreground flex items-center justify-center text-[10px] font-bold border">
                  {u.name.charAt(0)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {contractFile && (
            <Button variant="outline" onClick={handleDownload} type="button" className="text-blue-600 border-blue-200 hover:bg-blue-50">
              <Download className="mr-2 h-4 w-4" />
              {t("candidates.sign.download_pdf")}
            </Button>
          )}

          <Button variant="outline" onClick={() => setShowRejectDialog(true)} type="button" className="text-red-600 hover:text-red-700">
            <X className="mr-2 h-4 w-4" />
            {t("candidates.sign.reject")}
          </Button>
          {!isContractSigned && (
            <Button onClick={handleSave} disabled={signatures.length === 0 || isSaving} className="font-bold">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? t("candidates.sign.finalizing") : t("candidates.sign.finalize")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden relative">
        <div
          ref={containerRef}
          className="lg:col-span-4 h-full border-r bg-muted/20 relative overflow-hidden"
        >
          {loadingContract && <div>{t("candidates.sign.loading_pdf")}</div>}

          {!loadingContract && pdfUrl && (
            <PDFViewer fileUrl={pdfUrl} onPageChange={setCurrentPage}>
              {!isContractSigned && signatures.map((sig, idx) => (
                sig.placement?.page === currentPage && (
                  <div
                    key={`s-${idx}`}
                    className={`absolute border-4 border-emerald-500 border-dashed p-2 group z-50 ${draggingSignatureIdx === idx ? "cursor-grabbing ring-4 ring-emerald-500/80 bg-emerald-100/60" : "cursor-pointer hover:bg-emerald-50"}`}
                    style={{
                      left: `${sig.placement?.x}%`,
                      top: `${sig.placement?.y}%`,
                      width: sig.type === 'text' || sig.type === 'date' ? undefined : `${sig.placement?.width ?? DEFAULT_STAMP_WIDTH}%`,
                      transform: 'translate(-50%, -50%)',
                      userSelect: 'none',
                    }}
                    onMouseDown={e => {
                      e.preventDefault();
                      // Empty box: pick a stamp for THIS specific box. Filled box: allow moving it.
                      setDraggingSignatureIdx(idx);
                      if (!sig.value) {
                        setStampTargetIdx(idx);
                        setShowSavedSignatures(true);
                      }
                    }}
                  >
                    {sig.type === 'text' || sig.type === 'date' ? (
                      <div className="text-emerald-900 font-bold whitespace-nowrap text-lg" style={sig.style}>{sig.value}</div>
                    ) : sig.value ? (
                      <>
                        <img src={sig.value} alt={t("candidates.sign.stamp")} className="pointer-events-none select-none w-full h-auto block" />
                        <div
                          className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white cursor-nwse-resize"
                          title={t("candidates.sign.resize")}
                          onMouseDown={e => startResize(e, idx)}
                        />
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-emerald-600 font-bold whitespace-nowrap text-xs uppercase tracking-wider mb-1">
                          {sig.field_name === 'initials' ? t("candidates.sign.initials") : t("candidates.sign.stamp")}
                        </div>
                        <div className="text-[10px] text-emerald-500/70">{t("candidates.sign.click_to_stamp")}</div>
                      </div>
                    )}
                  </div>
                )
              ))}
            </PDFViewer>
          )}
        </div>


        {!isContractSigned && (
          <div className="hidden lg:block col-span-1 border-l bg-background p-4 shadow-xl z-20">
            {contracts.length > 1 && (
              <div className="mb-6 border-b pb-6">
                <div className="text-xs font-semibold text-muted-foreground mb-3">{t("candidates.sign.contracts")}</div>
                <div className="flex flex-col gap-2">
                  {contracts.map(c => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${activeContractId === c.id ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'bg-card hover:bg-accent border-transparent'}`}
                      onClick={() => {
                        if (isSaving || loadingContract) return;
                        setActiveContractId(c.id);
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium truncate" title={c.name}>{c.name}</span>
                        {c.status === 'signed' ? (
                          <CheckSquare className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-yellow-500 opacity-50"></div>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] uppercase font-bold ${c.status === 'signed' ? 'text-emerald-600' : 'text-yellow-600'}`}>
                          {c.status === 'pending' ? t("candidates.sign.status_pending") : t("candidates.sign.status_signed")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="font-bold text-xs text-muted-foreground mb-4 tracking-wider">{t("candidates.sign.saved_signatures")}</div>

            {savedSignatures.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-6">
                {t("candidates.sign.no_stamps")}{" "}
                <Link href="/dashboard/signatures" className="underline">{t("candidates.sign.manage_stamps")}</Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 mb-6">
                {savedSignatures.map((sig: any) => (
                  <button
                    key={sig.id}
                    type="button"
                    className="border rounded-lg p-2 bg-card hover:border-primary hover:bg-accent transition-colors shadow-sm"
                    onClick={() => handleAddSavedSignature(sig.value)}
                  >
                    <img src={sig.value} alt={t("candidates.sign.stamp")} className="w-full h-16 object-contain bg-white rounded" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">{t("candidates.sign.instructions_title")}</p>
              <p>{t("candidates.sign.instructions_text")}</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showSavedSignatures} onOpenChange={(o) => { setShowSavedSignatures(o); if (!o) setStampTargetIdx(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("candidates.sign.modal.select_saved")}</DialogTitle>
            <DialogDescription>{t("candidates.sign.modal.choose_saved")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto p-1">
            {savedSignatures.map((sig: any) => (
              <div key={sig.id} className="border rounded-lg p-4 cursor-pointer hover:border-primary bg-card hover:bg-accent transition-colors shadow-sm" onClick={() => handleAddSavedSignature(sig.value)}>
                <img src={sig.value} alt={t("candidates.sign.stamp")} className="w-full h-24 object-contain bg-white rounded" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
