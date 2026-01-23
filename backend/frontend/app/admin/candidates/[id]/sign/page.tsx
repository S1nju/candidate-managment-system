"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation" // Changed from next/router to next/navigation for app dir
import dynamic from "next/dynamic"
import { SignaturePad } from "@/components/signing/signature-pad"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save } from "lucide-react"
import axios from "@/lib/axios"
import { useToast } from "@/hooks/use-toast"
// import { useAuth } from "@/hooks/use-auth" // Assuming auth is handled by layout or middleware
import useSWR from "swr"
import { Calendar, PenLine, Stamp, Type, CheckSquare } from "lucide-react"

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
      // { type: "stamp", label: "Stamp", icon: <Stamp className="h-4 w-4" /> }, // Keeping it simple for candidate
    ],
  },
  {
    group: "Other Fields",
    fields: [
      // { type: "date", label: "Date Signed", icon: <Calendar className="h-4 w-4" /> },
      // { type: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
    ],
  },
]

export default function SignCandidateContractPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  // const params = useParams() // Params passed via props in App Router page component if consistent
  const id = params.id
  const { toast } = useToast()

  // State for signatures
  const [signatures, setSignatures] = useState<Array<{
    type: "drawn" | "typed" | "stamp",
    value: string,
    placement: { x: number, y: number, page: number },
    style?: React.CSSProperties
  }>>([])

  // Drag state
  const [isDragging, setIsDragging] = useState<null | "signature">(null)
  const [draggingField, setDraggingField] = useState<string | null>(null)
  const [draggingSignatureIdx, setDraggingSignatureIdx] = useState<number | null>(null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch Candidate
  const { data: candidate, error, isLoading } = useSWR(`/api/candidates/${id}`, () => axios.get(`/api/candidates/${id}`).then(res => res.data))

  const [contractFile, setContractFile] = useState<string | null>(null)

  // Generate/Get contract on load
  useEffect(() => {
    async function fetchContract() {
      try {
        // We call generate to get the filename (creates if not exists or regenerates)
        // For simplicity/demo. In real app might check if exists.
        const res = await axios.post(`/api/candidates/${id}/generate-contract`)
        setContractFile(res.data.file)
      } catch (err) {
        console.error("Failed to get contract", err)
        toast({ title: "Error", description: "Could not load contract", variant: "destructive" })
      }
    }
    if (id) fetchContract()
  }, [id, toast])

  const pdfUrl = contractFile ? `/api/contracts/${contractFile}` : null

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
          type: sig.type === "typed" ? "text" : "image", // adapted for backend service expectation
          value: sig.value,
          placement: sig.placement,
        })),
        ip_address: "127.0.0.1", // Should be handled by backend
        user_agent: navigator.userAgent
      }

      await axios.post(`/api/candidates/${id}/sign-contract`, payload)

      toast({ title: "Success", description: "Contract signed successfully" })
      router.push(`/admin/candidates/${id}`)
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

  // Drag logic
  const containerRef = useRef<HTMLDivElement>(null)

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

  if (isLoading) return <div className="p-10 text-center">Loading...</div>
  if (error) return <div className="p-10 text-center text-red-500">Failed to load candidate</div>

  return (
    <div className="h-screen flex flex-col pt-16 bg-muted/10">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-background fixed top-0 w-full z-10 h-16 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Sign Contract</h1>
            <p className="text-sm text-muted-foreground">{candidate?.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden">
        {/* PDF Viewer */}
        <div
          ref={containerRef}
          className="lg:col-span-4 border-r bg-muted/20 relative overflow-hidden flex flex-col"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            if (draggingField === "signature") {
              const rect = containerRef.current?.getBoundingClientRect()
              if (rect) {
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                setSignatures(prev => [...prev, { type: "drawn", value: "", placement: { x, y, page: currentPage } }])
                // We trigger signature pad immediately for convenience or wait for click?
                // Original UX: drop creates empty placeholder? 
                // Re-reading original: "if (draggingField === "signature") { setSignatures(...) }" 
                // AND buttons in sidebar set showSignaturePad
                // Actually original UX: click sidebar item -> open pad -> create signature center screen -> then drag?
                // OR drag sidebar item -> drop -> create signature?
                // In original: onDrop sets signature with value=""? 
                // Check original: handleSignatureCreate adds to center. 
                // Sidebar onClick calls setShowSignaturePad.
                // I'll stick to Sidebar Click -> Modal -> Place in center -> Drag.
              }
            }
            setDraggingField(null)
          }}
        >
          <div className="hidden lg:block absolute top-4 right-4 z-50">
            <Button onClick={handleSave} disabled={signatures.length === 0 || isSaving} className="py-3 px-6 text-base font-bold shadow-lg">
              <Save className="mr-2 h-5 w-5" />
              {isSaving ? "Saving..." : "Finalize & Sign"}
            </Button>
          </div>

          {pdfUrl && (
            <PDFViewer fileUrl={pdfUrl} onPageChange={setCurrentPage}>
              {signatures.map((sig, idx) => (
                sig.placement.page === currentPage && (
                  <div
                    key={idx}
                    className={`absolute border-4 border-red-500 border-dashed p-2 group z-50 ${draggingSignatureIdx === idx ? "cursor-grabbing ring-4 ring-red-500/80 bg-red-100/60" : "cursor-move"}`}
                    style={{ left: `${sig.placement.x}%`, top: `${sig.placement.y}%`, transform: 'translate(-50%, -50%)', userSelect: 'none', pointerEvents: 'auto' }}
                    onMouseDown={e => { e.preventDefault(); setDraggingSignatureIdx(idx) }}
                  >
                    {sig.value ? (
                      <img src={sig.value} alt="Signature" className="pointer-events-none select-none" style={{ height: '64px', filter: 'none', fontWeight: 700 }} />
                    ) : (
                      <div className="text-red-500 font-bold whitespace-nowrap">Double click to sign</div>
                    )}
                  </div>
                )
              ))}
            </PDFViewer>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block col-span-1 border-l bg-background/90 p-4">
          <div className="font-bold text-xs text-muted-foreground mb-2">FIELDS</div>
          {FIELD_TYPES.map((group, i) => (
            <div key={i} className="mb-4">
              {group.fields.map(field => (
                <div
                  key={field.type}
                  className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-grab select-none"
                  onClick={() => {
                    if (field.type === "signature") setShowSignaturePad(true)
                  }}
                >
                  {field.icon}
                  <span className="text-sm">{field.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={() => setShowSignaturePad(false)}>&times;</button>
            <SignaturePad onSignatureCreate={(type, value) => {
              // If we have an empty signature (created by drop), fill it?
              // Or just add new one. Simpler to always add new one at center.
              setSignatures(prev => [...prev, { type, value, placement: { x: 50, y: 50, page: currentPage } }])
              setShowSignaturePad(false)
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
