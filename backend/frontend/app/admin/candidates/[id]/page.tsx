"use client"
import React, { useState } from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default function AdminCandidateDetailPage({ params }: { params: { id: string } }) {
  const { data, error, isLoading } = useSWR(`/api/candidates/${params.id}`, () => axios.get(`/api/candidates/${params.id}`).then(res => res.data))
  const candidate = data || {}
  const [contractFile, setContractFile] = useState<string | null>(null)
  const [loadingContract, setLoadingContract] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleGenerateContract = async () => {
    setLoadingContract(true)
    setErrorMsg("")
    try {
      const res = await axios.post(`/api/candidates/${params.id}/generate-contract`)
      setContractFile(res.data.file)
      setLoadingContract(false)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to generate contract")
      setLoadingContract(false)
    }
  }

  if (isLoading) return <div className="p-10 text-center">Loading candidate details...</div>
  if (error) return <div className="p-10 text-center text-red-500">Failed to load candidate</div>

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Candidate: {candidate.name}</h1>
        <Badge variant={candidate.contract_signed ? "default" : "secondary"}>
          {candidate.contract_signed ? "Signed" : "Pending Signature"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="font-semibold text-muted-foreground block">Email</span> {candidate.email}</div>
          <div><span className="font-semibold text-muted-foreground block">Phone</span> {candidate.phone}</div>
          <div><span className="font-semibold text-muted-foreground block">Gender</span> {candidate.gender}</div>
          <div><span className="font-semibold text-muted-foreground block">Nationality</span> {candidate.nationality}</div>
          <div><span className="font-semibold text-muted-foreground block">Date of Birth</span> {candidate.dob ? new Date(candidate.dob).toLocaleDateString() : '-'}</div>
          <div><span className="font-semibold text-muted-foreground block">Address</span> {candidate.address}</div>
          <div><span className="font-semibold text-muted-foreground block">Social Security Number</span> {candidate.social_security_number}</div>
          <div><span className="font-semibold text-muted-foreground block">Emergency Contact</span> {candidate.emergency_phone}</div>
          {candidate.photo_url && (
            <div className="md:col-span-2 mt-4">
              <span className="font-semibold text-muted-foreground block mb-2">Photo</span>
              <img src={candidate.photo_url} alt="Candidate Photo" className="w-32 h-32 object-cover rounded-lg border" />
            </div>
          )}
          {candidate.cv_url && (
            <div className="md:col-span-2 mt-2">
              <a href={candidate.cv_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">View CV</a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recruitment & Contract Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="font-semibold text-muted-foreground block">Recruitment City</span> {candidate.recruitment_city}</div>
          <div><span className="font-semibold text-muted-foreground block">Animator</span> {candidate.animator_name}</div>
          <div><span className="font-semibold text-muted-foreground block">Product</span> {candidate.product_justcost}</div>
          <div><span className="font-semibold text-muted-foreground block">Contract Type</span> {candidate.contract_type}</div>
          <div><span className="font-semibold text-muted-foreground block">Start Date</span> {candidate.start_date ? new Date(candidate.start_date).toLocaleDateString() : '-'}</div>
          <div><span className="font-semibold text-muted-foreground block">Position</span> {candidate.position}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleGenerateContract} disabled={loadingContract}>
              {loadingContract ? "Generating..." : "Generate Contract Preview"}
            </Button>

            <Link href={`/admin/candidates/${params.id}/sign`}>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                Go to Signing Page
              </Button>
            </Link>
          </div>

          {errorMsg && <div className="text-red-500">{errorMsg}</div>}

          {contractFile && (
            <div className="mt-4 p-4 bg-slate-100 rounded border">
              <p className="font-medium mb-2">Contract Generated: {contractFile}</p>
              <div className="flex gap-2">
                <a href={`/api/contracts/${contractFile}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  Download / View PDF (Mock)
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
