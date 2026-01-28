"use client"

import React, { use, useEffect, useState } from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  UserIcon, Mail, Phone, Calendar, MapPin,
  FileText, Briefcase, UserCheck, Activity,
  AlertCircle, CheckCircle2, FileCheck, PenToolIcon,
  Edit, Save, X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { useLanguage } from "@/context/language-context"
import { useToast } from "@/hooks/use-toast"
import { EmailEditorDialog } from "@/components/candidates/email-editor-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const { data: candidate, error, isLoading, mutate } = useSWR(`/api/candidates/${id}`)

  useEffect(() => {
    if (candidate) {
      setEditForm({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        dob: candidate.dob,
        nationality: candidate.nationality,
        social_security_number: candidate.social_security_number,
        gender: candidate.gender,
        address: candidate.address,
        emergency_phone: candidate.emergency_phone,
        position: candidate.position,
        contract_type: candidate.contract_type,
        recruitment_city: candidate.recruitment_city,
        animator_name: candidate.animator_name,
        product_justcost: candidate.product_justcost,
      })
    }
  }, [candidate])

  const { data: kycData, isLoading: kycLoading } = useSWR(
    candidate?.didit_session_id ? `/api/candidates/didit-decision/${candidate.didit_session_id}` : null
  )

  const handleUpdate = async () => {
    try {
      await axios.put(`/api/candidates/${id}`, editForm)
      toast({ title: "Candidate updated successfully" })
      setIsEditing(false)
      mutate()
    } catch (err: any) {
      console.error("Update failed", err)
      toast({
        title: "Failed to update candidate",
        description: err.response?.data?.message || err.message,
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return <div className="p-8 space-y-4">
      <Skeleton className="h-12 w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  }

  if (error || !candidate) return <div className="p-8 text-red-500">{t("common.error")}</div>

  const isSigned = !!(candidate.signature_id || candidate.contract_status?.toLowerCase() === 'signed');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
            <Badge
              variant={isSigned ? "default" : candidate.contract_status === 'rejected' ? "destructive" : "secondary"}
              className={isSigned ? "bg-emerald-600 hover:bg-emerald-700" : candidate.contract_status === 'rejected' ? "" : ""}
            >
              {isSigned ? <><CheckCircle2 className="w-3 h-3 mr-1" /> {t("candidates.detail.contract_signed")}</> :
                candidate.contract_status === 'rejected' ? t("candidates.detail.contract_rejected") :
                  t("candidates.detail.pending_signature")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> {candidate.position || "No position specified"}
            <span className="text-slate-300">|</span>
            {candidate.contract_type || "No contract type"}
            {candidate.form && (
              <>
                <span className="text-slate-300">|</span>
                <Badge variant="outline" className="font-normal border-blue-200 text-blue-700 bg-blue-50">
                  Form: {candidate.form.title}
                </Badge>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(!isSigned && candidate.contract_status === 'pending' && candidate.form?.contracts?.length > 0) ? (
            <Link href={`/dashboard/candidates/${candidate.id}/sign`}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <PenToolIcon className="w-4 h-4 mr-2" />
                {t("candidates.detail.sign_contract")}
              </Button>
            </Link>
          ) : (isSigned || candidate.contract_status === 'signed') && (
            <Link href={`/dashboard/candidates/${candidate.id}/sign`}>
              <Button variant="outline">
                <FileCheck className="w-4 h-4 mr-2" />
                {t("candidates.detail.view_contract")}
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => setIsEmailOpen(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Email Candidate
          </Button>
        </div>
      </div>

      <EmailEditorDialog
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        recipients={[candidate.email]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Info */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-blue-500" /> {t("candidates.detail.personal_info")}</CardTitle>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditing(false)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleUpdate}>
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditing(true)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isEditing ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Full Name</Label>
                    <Input size={1} className="h-9" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input size={1} className="h-9" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input size={1} className="h-9" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date of Birth</Label>
                    <Input size={1} type="date" className="h-9" value={editForm.dob ? format(new Date(editForm.dob), 'yyyy-MM-dd') : ''} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nationality</Label>
                    <Input size={1} className="h-9" value={editForm.nationality} onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">SSN</Label>
                    <Input size={1} className="h-9" value={editForm.social_security_number} onChange={(e) => setEditForm({ ...editForm, social_security_number: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gender</Label>
                    <Select value={editForm.gender} onValueChange={(val) => setEditForm({ ...editForm, gender: val })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Emergency Phone</Label>
                    <Input size={1} className="h-9" value={editForm.emergency_phone} onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs">Address</Label>
                    <Input size={1} className="h-9" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                  </div>
                  <Separator className="md:col-span-2 my-2" />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Position</Label>
                    <Input size={1} className="h-9" value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contract Type</Label>
                    <Input size={1} className="h-9" value={editForm.contract_type} onChange={(e) => setEditForm({ ...editForm, contract_type: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Recruitment City</Label>
                    <Input size={1} className="h-9" value={editForm.recruitment_city} onChange={(e) => setEditForm({ ...editForm, recruitment_city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Animator Name</Label>
                    <Input size={1} className="h-9" value={editForm.animator_name} onChange={(e) => setEditForm({ ...editForm, animator_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Product Justcost</Label>
                    <Input size={1} className="h-9" value={editForm.product_justcost} onChange={(e) => setEditForm({ ...editForm, product_justcost: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <InfoItem
                    label="Full Name"
                    value={candidate.name}
                    icon={<UserIcon className="w-4 h-4" />}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.email")}
                    value={candidate.email}
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.phone")}
                    value={candidate.phone}
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.dob")}
                    value={kycData?.id_verifications?.[0]?.date_of_birth || (candidate.dob ? format(new Date(candidate.dob), 'PP') : '-')}
                    icon={<Calendar className="w-4 h-4" />}
                    verified={!!kycData?.id_verifications?.[0]?.date_of_birth}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.nationality")}
                    value={kycData?.id_verifications?.[0]?.nationality || candidate.nationality}
                    icon={<MapPin className="w-4 h-4" />}
                    verified={!!kycData?.id_verifications?.[0]?.nationality}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.ssn")}
                    value={candidate.social_security_number}
                    icon={<Activity className="w-4 h-4" />}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.gender")}
                    value={candidate.gender}
                    icon={<UserCheck className="w-4 h-4" />}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.address")}
                    value={kycData?.id_verifications?.[0]?.formatted_address || kycData?.id_verifications?.[0]?.address || candidate.address}
                    colSpan={2}
                    icon={<MapPin className="w-4 h-4" />}
                    verified={!!(kycData?.id_verifications?.[0]?.formatted_address || kycData?.id_verifications?.[0]?.address)}
                  />
                  <InfoItem
                    label={t("candidates.detail.labels.emergency_contact")}
                    value={candidate.emergency_phone}
                    colSpan={2}
                    icon={<AlertCircle className="w-4 h-4" />}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-orange-500" /> {t("candidates.detail.employment_details")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isEditing ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Position</Label>
                    <Input size={1} className="h-9" value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contract Type</Label>
                    <Input size={1} className="h-9" value={editForm.contract_type} onChange={(e) => setEditForm({ ...editForm, contract_type: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <Input size={1} type="date" className="h-9" value={editForm.start_date ? format(new Date(editForm.start_date), 'yyyy-MM-dd') : ''} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Recruitment City</Label>
                    <Input size={1} className="h-9" value={editForm.recruitment_city} onChange={(e) => setEditForm({ ...editForm, recruitment_city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Animator Name</Label>
                    <Input size={1} className="h-9" value={editForm.animator_name} onChange={(e) => setEditForm({ ...editForm, animator_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Product Justcost</Label>
                    <Input size={1} className="h-9" value={editForm.product_justcost} onChange={(e) => setEditForm({ ...editForm, product_justcost: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <InfoItem label={t("candidates.detail.labels.position")} value={candidate.position} />
                  <InfoItem label={t("candidates.detail.labels.contract_type")} value={candidate.contract_type} />
                  <InfoItem label={t("candidates.detail.labels.start_date")} value={candidate.start_date ? format(new Date(candidate.start_date), 'PP') : '-'} />
                  <InfoItem label={t("candidates.detail.labels.recruitment_city")} value={candidate.recruitment_city} />
                  <InfoItem label={t("candidates.detail.labels.animator")} value={candidate.animator_name} />
                  <InfoItem label={t("candidates.detail.labels.product")} value={candidate.product_justcost} />
                </>
              )}
            </CardContent>
          </Card>

          {candidate.data && Object.keys(candidate.data).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-500" /> Dynamic Form Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(candidate.data).map(([key, value]) => {
                    const displayedKeys = [
                      'name', 'full_name', 'email', 'phone', 'dob', 'nationality',
                      'ssn', 'social_security_number', 'gender', 'address',
                      'emergency_phone', 'position', 'contract_type', 'start_date',
                      'recruitment_city', 'animator_name', 'product_justcost',
                      'didit_session_id'
                    ];
                    if (displayedKeys.includes(key) || (value && typeof value === 'object' && (value as any).path)) return null;
                    return (
                      <div key={key} className="border-b pb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-semibold">{String(value)}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments Section */}
          {candidate.data && Object.values(candidate.data).some((v: any) => v && typeof v === 'object' && (v as any).path) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500" /> Uploaded Attachments</CardTitle>
                <CardDescription>Files submitted via dynamic application forms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(candidate.data).map(([key, value]: [string, any]) => {
                    if (!value || typeof value !== 'object' || !value.path) return null;
                    const isImage = value.type?.startsWith('image/');

                    // Determine if it's a legacy public path or a new secure path
                    const path = value.path;
                    const isLegacy = path.startsWith('/storage/');

                    const fullPath = isLegacy
                      ? `${axios.defaults.baseURL}${path}`
                      : `${axios.defaults.baseURL}/api/candidates/files?path=${encodeURIComponent(path)}`;

                    return (
                      <div key={key} className="group relative border rounded-lg p-2 hover:bg-slate-50 transition-colors">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 px-1">{key.replace(/_/g, ' ')}</p>
                        <div className="aspect-square rounded border bg-white overflow-hidden flex items-center justify-center mb-2">
                          {isImage ? (
                            <img src={fullPath} alt={value.name} className="h-full w-full object-cover" />
                          ) : (
                            <FileText className="h-10 w-10 text-blue-500" />
                          )}
                        </div>
                        <div className="px-1">
                          <p className="text-xs font-medium truncate" title={value.name}>{value.name}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => window.open(fullPath, '_blank')}>
                              View
                            </Button>
                            <a href={fullPath} download={value.name} className="text-[10px] text-blue-600 hover:underline">
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Contracts Section */}
          {candidate.generated_contracts && candidate.generated_contracts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-emerald-500" /> Auto-Generated Documents</CardTitle>
                <CardDescription>Contracts automatically created from form templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {candidate.generated_contracts.map((gc: any) => (
                    <div key={gc.id} className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50/30 border-emerald-100">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-emerald-600" />
                        <div>
                          <p className="text-sm font-semibold">{gc.form_contract?.name || "Contract Document"}</p>
                          <p className="text-[10px] text-muted-foreground">Generated {format(new Date(gc.generated_at), 'PPP p')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(() => {
                          const downloadUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/generated-contracts/${gc.id}/download`;
                          return (
                            <>
                              <Button variant="outline" size="sm" onClick={() => window.open(downloadUrl, '_blank')}>
                                View PDF
                              </Button>
                              <Button size="sm" asChild>
                                <a href={downloadUrl} download>Download</a>
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Candidate Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photo Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-purple-500" /> Photo</CardTitle>
              {kycData?.id_verifications?.[0]?.portrait_image && (
                <Badge variant="outline" className="text-[10px] uppercase border-purple-200 text-purple-700 bg-purple-50 font-bold">Verified</Badge>
              )}
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {kycLoading ? (
                <Skeleton className="w-48 h-48 rounded-lg" />
              ) : kycData?.id_verifications?.[0]?.portrait_image || candidate.photo_url ? (
                <img
                  src={kycData?.id_verifications?.[0]?.portrait_image || candidate.photo_url}
                  alt={candidate.name}
                  className="w-48 h-48 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-24 h-24 text-slate-400" />
                </div>
              )}
              {kycData?.id_verifications?.[0]?.document_type && (
                <p className="text-xs font-medium text-muted-foreground bg-slate-100 px-2 py-1 rounded">
                  Verified via {kycData.id_verifications[0].document_type}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ID Documents (from Didit) */}
          {kycData?.id_verifications?.[0] && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-blue-500" /> Identification Documents</CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase border-blue-200 text-blue-700 bg-blue-50 font-bold">Verified</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">Front Image</p>
                    <img src={kycData.id_verifications[0].front_image} className="w-full rounded border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(kycData.id_verifications[0].front_image, '_blank')} />
                  </div>
                  {kycData.id_verifications[0].back_image && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Back Image</p>
                      <img src={kycData.id_verifications[0].back_image} className="w-full rounded border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(kycData.id_verifications[0].back_image, '_blank')} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">ID Number</span>
                    <span className="font-semibold">{kycData.id_verifications[0].document_number}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">Nationality</span>
                    <span className="font-semibold">{kycData.id_verifications[0].nationality}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">Issuing State</span>
                    <span className="font-semibold">{kycData.id_verifications[0].issuing_state_name}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">Date of Birth</span>
                    <span className="font-semibold">{kycData.id_verifications[0].date_of_birth}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-semibold text-right max-w-[200px]">{kycData.id_verifications[0].formatted_address || kycData.id_verifications[0].address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-500" /> {t("candidates.detail.skills")}</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("candidates.detail.no_skills")}</p>
              )}
            </CardContent>
          </Card>

          {/* Education Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-green-500" /> {t("candidates.detail.education")}</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.education && candidate.education.length > 0 ? (
                <div className="space-y-3">
                  {candidate.education.map((edu: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-blue-500 pl-3">
                      <p className="font-semibold text-sm">{edu.degree || edu.title}</p>
                      <p className="text-xs text-muted-foreground">{edu.institution}</p>
                      {edu.year && <p className="text-xs text-muted-foreground">{edu.year}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("candidates.detail.no_education")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value, icon, colSpan = 1, verified = false }: { label: string, value: string | number, icon?: React.ReactNode, colSpan?: number, verified?: boolean }) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <div className="text-sm font-medium text-muted-foreground flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon} {label}
        </div>
        {verified && (
          <Badge variant="outline" className="h-4 text-[8px] px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-2 h-2 mr-0.5" /> Verified
          </Badge>
        )}
      </div>
      <div className="text-base font-semibold text-slate-800 dark:text-slate-200">
        {value || "-"}
      </div>
    </div>
  )
}
