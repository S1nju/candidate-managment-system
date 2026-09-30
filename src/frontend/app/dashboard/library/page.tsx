"use client"

import { useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { formsApi } from "@/services/api/forms.api"
import apiClient from "@/services/api/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, FileText, Trash2, Upload, Loader2, Download, PenTool } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { LibraryDocumentElementsEditor, type LibraryElement } from "@/components/forms/library-document-elements-editor"

interface LibraryDocument {
  id: number
  name: string
  description: string | null
  original_filename: string | null
  size: number
  elements?: LibraryElement[] | null
  created_at: string
  updated_at: string
}

function formatSize(bytes: number) {
  if (!bytes) return "0 KB"
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export default function LibraryPage() {
  useAuth({ middleware: "auth" })
  const { toast } = useToast()
  const { t } = useLanguage()

  const { data, mutate, isLoading } = useSWR<LibraryDocument[]>("/api/library-documents", () =>
    formsApi.getLibraryDocuments(),
  )
  const documents = useMemo(() => data ?? [], [data])

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [replacingId, setReplacingId] = useState<number | null>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const [editingDoc, setEditingDoc] = useState<LibraryDocument | null>(null)
  const [savingElements, setSavingElements] = useState(false)

  const handleSaveElements = async (elements: LibraryElement[]) => {
    if (!editingDoc) return
    setSavingElements(true)
    try {
      await formsApi.updateLibraryDocumentElements(editingDoc.id, elements)
      toast({ title: t("library.elements.saved") })
      setEditingDoc(null)
      mutate()
    } catch (error: any) {
      toast({
        title: t("library.toasts.error"),
        description: error?.response?.data?.message || t("library.elements.save_failed"),
        variant: "destructive",
      })
    } finally {
      setSavingElements(false)
    }
  }

  const resetCreateForm = () => {
    setName("")
    setDescription("")
    setFile(null)
  }

  const handleCreate = async () => {
    if (!name || !file) {
      toast({ title: t("library.toasts.missing_fields"), variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      await formsApi.createLibraryDocument(name, file, description || undefined)
      toast({ title: t("library.toasts.created") })
      resetCreateForm()
      setCreateOpen(false)
      mutate()
    } catch (error: any) {
      toast({
        title: t("library.toasts.error"),
        description: error?.response?.data?.message || t("library.toasts.create_failed"),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReplaceFile = async (id: number, newFile: File) => {
    setReplacingId(id)
    try {
      await formsApi.updateLibraryDocument(id, { file: newFile })
      toast({ title: t("library.toasts.updated") })
      mutate()
    } catch (error: any) {
      toast({
        title: t("library.toasts.error"),
        description: error?.response?.data?.message || t("library.toasts.update_failed"),
        variant: "destructive",
      })
    } finally {
      setReplacingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("library.confirm_delete"))) return
    try {
      await formsApi.deleteLibraryDocument(id)
      toast({ title: t("library.toasts.deleted") })
      mutate()
    } catch (error: any) {
      toast({
        title: t("library.toasts.error"),
        description: error?.response?.data?.message || t("library.toasts.delete_failed"),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("library.title")}</h1>
          <p className="text-muted-foreground">{t("library.subtitle")}</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("library.add_document")}
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && documents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">{t("library.empty")}</p>
            <Button onClick={() => setCreateOpen(true)}>{t("library.add_first")}</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="h-8 w-8 p-0 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="mt-2">{doc.name}</CardTitle>
              {doc.description && <CardDescription>{doc.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {doc.original_filename} · {formatSize(doc.size)}
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setEditingDoc(doc)}>
                <PenTool className="h-4 w-4 mr-2" />
                {t("library.elements.button")}
                {(doc.elements?.length ?? 0) > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({t("library.elements.count").replace("{count}", String(doc.elements!.length))})
                  </span>
                )}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={`${apiClient.defaults.baseURL}/api/library-documents/${doc.id}/download`} download>
                    <Download className="h-4 w-4 mr-2" />
                    {t("library.download")}
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={replacingId === doc.id}
                  onClick={() => {
                    replaceInputRef.current?.setAttribute("data-target-id", String(doc.id))
                    replaceInputRef.current?.click()
                  }}
                >
                  {replacingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t("library.replace")}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const targetFile = e.target.files?.[0]
          const targetId = replaceInputRef.current?.getAttribute("data-target-id")
          if (targetFile && targetId) {
            handleReplaceFile(Number(targetId), targetFile)
          }
          e.target.value = ""
        }}
      />

      {editingDoc && (
        <LibraryDocumentElementsEditor
          key={`${editingDoc.id}-${editingDoc.updated_at}`}
          open
          onOpenChange={(o) => !o && setEditingDoc(null)}
          documentName={editingDoc.name}
          fileUrl={`${apiClient.defaults.baseURL}/api/library-documents/${editingDoc.id}/download`}
          elements={editingDoc.elements ?? []}
          saving={savingElements}
          onSave={handleSaveElements}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("library.add_document")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("library.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("library.name_placeholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("library.description")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("library.file")}</Label>
              <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
