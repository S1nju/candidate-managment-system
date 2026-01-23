"use client"
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/context/language-context"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import useSWR from "swr"
import axios from "@/lib/axios"
import { SignaturePad } from "@/components/signing/signature-pad"
import { format } from "date-fns"
import { DndContext, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from "lucide-react"

function SortableSignatureCard({ sig, id, onDelete }: any) {
  const { t } = useLanguage()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className={isDragging ? "ring-2 ring-primary/60 bg-primary/5" : ""}>
      <Card className="bg-white dark:bg-white border border-gray-200">
        <CardHeader className="flex flex-row items-center gap-2 justify-between">
          <div className="flex flex-row items-center gap-2">
            <span {...listeners} className="cursor-grab active:cursor-grabbing p-1"><GripVertical size={18} /></span>
            <CardTitle>{sig.type === 'drawn' ? t("signatures.types.drawn") : sig.type === 'typed' ? t("signatures.types.typed") : t("signatures.types.uploaded")}</CardTitle>
          </div>
          <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-100" onClick={() => onDelete(sig.id)} title={t("signatures.delete_title")}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </CardHeader>
        <CardContent>
          {sig.type === 'drawn' || sig.type === 'uploaded' ? (
            <img src={sig.value} alt="Signature" className="max-h-24" />
          ) : (
            <span className="text-2xl font-signature">{sig.value}</span>
          )}
          <div className="text-xs text-muted-foreground mt-2">{sig.created_at}</div>
          {sig.initials && <div className="text-xs text-muted-foreground">{t("signatures.labels.initials")}: {sig.initials}</div>}
          {sig.date && <div className="text-xs text-muted-foreground">{t("signatures.labels.date")}: {sig.date}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignaturesPage() {
  useAuth({ middleware: "auth" })
  const { t } = useLanguage()
  const [tab, setTab] = useState("saved")
  const { data: response, mutate } = useSWR("/api/signatures", () => axios.get("/api/signatures").then(res => res.data))
  const signatures = response?.data || []
  const [initials, setInitials] = useState("")
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"))

  // Upload signature image
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const formData = new FormData()
    formData.append("file", e.target.files[0])
    await axios.post("/api/signatures/upload", formData)
    mutate()
  }

  // Save signature handler
  const handleSaveSignature = async (type: "drawn" | "typed" | "uploaded", value: string) => {
    let backendType = type;
    await axios.post("/api/signatures", {
      type: backendType,
      value,
      initials: initials || null,
      date: date || format(new Date(), "yyyy-MM-dd"),
    })
    mutate()
    setTab("saved"); // Switch to saved tab
    setInitials(""); // Reset initials
    setDate(format(new Date(), "yyyy-MM-dd")); // Reset date
  }

  const [orderedSignatures, setOrderedSignatures] = useState(signatures)

  // Keep orderedSignatures in sync with SWR
  useEffect(() => {
    setOrderedSignatures(signatures)
  }, [signatures])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = orderedSignatures.findIndex((s: any) => s.id === active.id)
      const newIndex = orderedSignatures.findIndex((s: any) => s.id === over.id)
      setOrderedSignatures(arrayMove(orderedSignatures, oldIndex, newIndex))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("signatures.title")}</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="saved">{t("signatures.tabs.saved")}</TabsTrigger>
          <TabsTrigger value="draw">{t("signatures.tabs.draw")}</TabsTrigger>
          <TabsTrigger value="upload">{t("signatures.tabs.upload")}</TabsTrigger>
        </TabsList>
        <TabsContent value="saved">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedSignatures.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {orderedSignatures.length === 0 && <p className="text-muted-foreground">{t("signatures.no_saved")}</p>}
                {orderedSignatures.map((sig: any) => (
                  <SortableSignatureCard
                    key={sig.id}
                    sig={sig}
                    id={sig.id}
                    onDelete={async (id: string) => {
                      await axios.delete(`/api/signatures/${id}`);
                      mutate();
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>
        <TabsContent value="draw">
          <div className="mb-4 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1">{t("signatures.labels.initials")}</label>
              <Input value={initials} onChange={e => setInitials(e.target.value)} maxLength={3} placeholder="JD" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1">{t("signatures.labels.date")}</label>
              <Input value={date} onChange={e => setDate(e.target.value)} type="date" />
            </div>
          </div>
          <SignaturePad onSignatureCreate={handleSaveSignature} />
        </TabsContent>
        <TabsContent value="upload">
          <Input type="file" accept="image/*" onChange={handleUpload} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
