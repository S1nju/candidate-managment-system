"use client"

import React, { useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight, Loader2, PenTool, Type, Trash2, Signature } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useLanguage } from "@/context/language-context"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export type LibraryElementType = "signature" | "initials" | "admin_signature" | "text"

export interface LibraryElement {
  id: string
  type: LibraryElementType
  page: number
  x: number // % of page width (box centre for boxes, left edge for text)
  y: number // % of page height (box centre / text vertical middle)
  width?: number
  height?: number
  text?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentName: string
  fileUrl: string
  elements: LibraryElement[]
  saving: boolean
  onSave: (elements: LibraryElement[]) => void
}

const BOX_DEFAULTS: Record<LibraryElementType, { width?: number; height?: number }> = {
  signature: { width: 20, height: 8 },
  initials: { width: 10, height: 6 },
  admin_signature: { width: 20, height: 8 },
  text: { width: 30, height: 4 },
}

const BOX_STYLES: Record<LibraryElementType, string> = {
  text: "border-amber-500 bg-amber-500/15 text-amber-700",
  signature: "border-blue-500 bg-blue-500/15 text-blue-700",
  initials: "border-emerald-500 bg-emerald-500/15 text-emerald-700",
  admin_signature: "border-purple-500 bg-purple-500/15 text-purple-700",
}

export function LibraryDocumentElementsEditor({
  open,
  onOpenChange,
  documentName,
  fileUrl,
  elements: initial,
  saving,
  onSave,
}: Props) {
  const { t } = useLanguage()
  const [elements, setElements] = useState<LibraryElement[]>(initial ?? [])
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const fileConfig = useMemo(() => ({ url: fileUrl, withCredentials: true }), [fileUrl])
  const selected = elements.find((e) => e.id === selectedId) ?? null

  const add = (type: LibraryElementType) => {
    const el: LibraryElement = {
      id: crypto.randomUUID(),
      type,
      page: pageNumber,
      x: 50,
      y: 50,
      ...BOX_DEFAULTS[type],
    }
    setElements((prev) => [...prev, el])
    setSelectedId(el.id)
  }

  const patch = (id: string, changes: Partial<LibraryElement>) =>
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)))

  const remove = (id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id))
    setSelectedId(null)
  }

  const startDrag = (ev: React.MouseEvent, el: LibraryElement) => {
    ev.preventDefault()
    setSelectedId(el.id)
    const rect = pageRef.current?.getBoundingClientRect()
    if (!rect) return
    const startX = ev.clientX
    const startY = ev.clientY
    const origin = { x: el.x, y: el.y }
    const move = (e: MouseEvent) => {
      const nx = origin.x + ((e.clientX - startX) / rect.width) * 100
      const ny = origin.y + ((e.clientY - startY) / rect.height) * 100
      patch(el.id, { x: Math.min(100, Math.max(0, nx)), y: Math.min(100, Math.max(0, ny)) })
    }
    const up = () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
  }

  const labelFor = (type: LibraryElementType) => t(`library.elements.types.${type}`)

  const pageElements = elements.filter((e) => e.page === pageNumber)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("library.elements.title")} — {documentName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 gap-4 min-h-0">
          <div className="w-64 shrink-0 space-y-4 overflow-auto">
            <div className="space-y-2">
              <Label>{t("library.elements.add")}</Label>
              <Button variant="outline" className="w-full justify-start" onClick={() => add("signature")}>
                <Signature className="h-4 w-4 mr-2 text-blue-600" />
                {labelFor("signature")}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => add("initials")}>
                <PenTool className="h-4 w-4 mr-2 text-emerald-600" />
                {labelFor("initials")}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => add("admin_signature")}>
                <Signature className="h-4 w-4 mr-2 text-purple-600" />
                {labelFor("admin_signature")}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => add("text")}>
                <Type className="h-4 w-4 mr-2" />
                {labelFor("text")}
              </Button>
            </div>

            {selected ? (
              <div className="space-y-3 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{labelFor(selected.type)}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(selected.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {selected.type === "text" && (
                  <div className="space-y-1">
                    <Label>{t("library.elements.text_label")}</Label>
                    <Input value={selected.text ?? ""} maxLength={500} onChange={(e) => patch(selected.id, { text: e.target.value })} />
                  </div>
                )}
                {(
                  <>
                    <div className="space-y-1">
                      <Label>{t("library.elements.width")} (%)</Label>
                      <Input
                        type="number"
                        min={2}
                        max={100}
                        value={Math.round(selected.width ?? 20)}
                        onChange={(e) => patch(selected.id, { width: Math.min(100, Math.max(2, Number(e.target.value) || 2)) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("library.elements.height")} (%)</Label>
                      <Input
                        type="number"
                        min={2}
                        max={100}
                        value={Math.round(selected.height ?? 8)}
                        onChange={(e) => patch(selected.id, { height: Math.min(100, Math.max(2, Number(e.target.value) || 2)) })}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("library.elements.hint")}</p>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-center gap-3 pb-2">
              <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {pageNumber} / {numPages || "…"}
              </span>
              <Button variant="outline" size="sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-muted/40 rounded-md p-4 flex justify-center">
              <div ref={pageRef} className="relative h-fit shadow-xl bg-white" onMouseDown={() => setSelectedId(null)}>
                <Document
                  file={fileConfig as any}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={(error) => console.error("PDF Load Error:", error)}
                  loading={<Loader2 className="h-6 w-6 animate-spin m-20" />}
                >
                  <Page pageNumber={pageNumber} width={640} renderAnnotationLayer={false} renderTextLayer={false} />
                </Document>
                <div className="absolute inset-0 pointer-events-none">
                  {pageElements.map((el) => (
                    <div
                      key={el.id}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        startDrag(e, el)
                      }}
                      className={`absolute pointer-events-auto cursor-move select-none ${
                        `border-2 border-dashed flex items-center justify-center text-[10px] font-medium overflow-hidden ${BOX_STYLES[el.type]} ${
                          selectedId === el.id ? "ring-2 ring-primary" : ""
                        }`
                      }`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: `${el.width ?? 20}%`,
                        height: `${el.height ?? 8}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {el.type === "text" && el.text ? `${labelFor("text")} : ${el.text}` : labelFor(el.type)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onSave(elements)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
