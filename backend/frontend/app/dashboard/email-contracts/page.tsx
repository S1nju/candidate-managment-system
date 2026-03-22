"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export default function EmailContractsPage() {
  useAuth({ middleware: "auth" })
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [formId, setFormId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { data: formsData } = useSWR("/api/forms", (url: string) => axios.get(url).then((res) => res.data))
  const { data: candidatesData, mutate } = useSWR(
    "/api/candidates?source=email_contract&per_page=20",
    (url: string) => axios.get(url).then((res) => res.data),
  )

  const forms = useMemo(() => {
    if (Array.isArray(formsData)) return formsData
    if (Array.isArray(formsData?.data)) return formsData.data
    return []
  }, [formsData])
  const candidates = useMemo(() => candidatesData?.data ?? [], [candidatesData])

  const handleSend = async () => {
    if (!name || !email || !formId) {
      toast({ title: "Missing fields", description: "Name, email and form are required.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      await axios.post("/api/candidates/email-contracts", {
        name,
        email,
        form_id: Number(formId),
      })

      toast({ title: "Invite sent", description: "Contract signing link was sent by email." })
      setName("")
      setEmail("")
      setFormId("")
      mutate()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to send invite",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Contracts</h1>
        <p className="text-muted-foreground">Send contract forms directly to specific people by email (no QR/public link).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send New Invite</CardTitle>
          <CardDescription>Choose a form and send a signing link to one recipient.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Form</Label>
            <Select value={formId} onValueChange={setFormId}>
              <SelectTrigger>
                <SelectValue placeholder="Select form" />
              </SelectTrigger>
              <SelectContent>
                {forms.map((form: any) => (
                  <SelectItem key={form.id} value={String(form.id)}>
                    {form.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleSend} disabled={submitting}>
              {submitting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Invites</CardTitle>
          <CardDescription>Recipients created through the email-only contracts section.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {candidates.length === 0 && <p className="text-sm text-muted-foreground">No email-only invites yet.</p>}
            {candidates.map((candidate: any) => (
              <div key={candidate.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium">{candidate.name}</p>
                  <p className="text-sm text-muted-foreground">{candidate.email}</p>
                  <p className="text-xs text-muted-foreground">Status: {candidate.contract_status}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Sent: {candidate.sent_for_signature_at ? new Date(candidate.sent_for_signature_at).toLocaleString() : "-"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
