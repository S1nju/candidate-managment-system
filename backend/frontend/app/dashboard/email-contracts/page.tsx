"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import axios from "@/lib/axios"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, FileText, Mail, Trash2 } from "lucide-react"

export default function EmailContractsPage() {
  useAuth({ middleware: "auth" })
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [contractId, setContractId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { data: contractsData, mutate: mutateContracts } = useSWR(
    "/api/email-contracts",
    (url: string) => axios.get(url).then((res) => res.data)
  )
  const { data: candidatesData, mutate: mutateCandidates } = useSWR(
    "/api/candidates?source=email_contract&per_page=20",
    (url: string) => axios.get(url).then((res) => res.data),
  )

  const contracts = useMemo(() => {
    if (Array.isArray(contractsData)) return contractsData
    if (Array.isArray(contractsData?.data)) return contractsData.data
    return []
  }, [contractsData])
  const candidates = useMemo(() => candidatesData?.data ?? [], [candidatesData])

  const handleSend = async () => {
    if (!name || !email || !contractId) {
      toast({ title: "Missing fields", description: "Name, email and contract template are required.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      await axios.post("/api/email-contracts/send", {
        name,
        email,
        contract_id: Number(contractId),
      })

      toast({ title: "Invite sent", description: "Contract signing link was sent by email." })
      setName("")
      setEmail("")
      setContractId("")
      mutateCandidates()
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

  const handleDeleteContract = async (id: number) => {
    if (confirm("Are you sure you want to delete this email contract template?")) {
      try {
        await axios.delete(`/api/email-contracts/${id}`)
        toast({ title: "Contract template deleted" })
        mutateContracts()
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to delete contract",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Contracts</h1>
          <p className="text-muted-foreground">Create and send contract templates directly via email.</p>
        </div>
        <Link href="/dashboard/email-contracts/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Contract
          </Button>
        </Link>
      </div>

      {/* Contract Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contracts.map((contract: any) => (
          <Card key={contract.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteContract(contract.id)}
                  className="h-8 w-8 p-0 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="mt-2">{contract.title}</CardTitle>
              {contract.description && (
                <CardDescription>{contract.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground font-medium">Fields:</span>{" "}
                  {contract.fields_count || 0}
                </p>
                <p>
                  <span className="text-muted-foreground font-medium">Sent:</span>{" "}
                  {contract.sent_count || 0}
                </p>
              </div>
              <Link href={`/dashboard/email-contracts/${contract.id}/send`} className="block">
                <Button className="w-full" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invite
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">No email contract templates yet.</p>
            <Link href="/dashboard/email-contracts/new">
              <Button>Create Your First Contract</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Send Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle>Send Contract Invite</CardTitle>
          <CardDescription>Choose a template and send a signing link to a recipient.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Recipient Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" type="email" />
          </div>
          <div className="space-y-2">
            <Label>Contract Template</Label>
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((contract: any) => (
                  <SelectItem key={contract.id} value={String(contract.id)}>
                    {contract.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleSend} disabled={submitting}>
              {submitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sent Invites */}
      <Card>
        <CardHeader>
          <CardTitle>Sent Invites</CardTitle>
          <CardDescription>Recipients created through email contract templates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {candidates.length === 0 && <p className="text-sm text-muted-foreground">No invites sent yet.</p>}
            {candidates.map((candidate: any) => (
              <div key={candidate.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium">{candidate.name}</p>
                  <p className="text-sm text-muted-foreground">{candidate.email}</p>
                  <p className="text-xs text-muted-foreground">Status: <span className="font-semibold">{candidate.contract_status}</span></p>
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
