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
  Edit, Save, X, Download, Eye, ExternalLink, ShieldCheck,
  ChevronRight,
  Trash2
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
  const [dynamicForm, setDynamicForm] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)

  const { data: candidate, error, isLoading, mutate } = useSWR(`/api/candidates/${id}`)

  const { data: kycData, isLoading: kycLoading } = useSWR(
    candidate?.didit_session_id ? `/api/candidates/didit-decision/${candidate.didit_session_id}` : null
  )

  // Initialize form data from candidate.data
  useEffect(() => {
    if (candidate?.data) {
      setDynamicForm(candidate.data)
    }
  }, [candidate])

  const handleUpdate = async () => {
    setIsSaving(true)
    try {
      await axios.put(`/api/candidates/${id}`, {
        data: dynamicForm
      })
      toast({ title: "Success", description: "Candidate data updated successfully" })
      setIsEditing(false)
      mutate()
    } catch (err: any) {
      console.error("Update failed", err)
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update candidate",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFieldChange = (key: string, value: any) => {
    setDynamicForm(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (error || !candidate) return <div className="p-8 text-red-500">{t("common.error")}</div>

  const isSigned = !!(candidate.signature_id || candidate.contract_status?.toLowerCase() === 'signed');

  // Separate data into text fields and file/image fields
  const textFields: [string, any][] = []
  const mediaFields: [string, any][] = []

  // Ensure candidate.data exists
  const rawData = candidate.data || {}

  Object.entries(dynamicForm).forEach(([key, value]) => {
    // Skip internal/meta keys if any
    const skipKeys = ['verified_data', 'rejection_reason', 'rejected_at', 'rejected_by'];
    if (skipKeys.includes(key)) return;

    const isFile = value && typeof value === 'object' && (value as any).path;
    if (isFile) {
      mediaFields.push([key, value]);
    } else {
      textFields.push([key, value]);
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Simple Header */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 ">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{candidate.name}</h1>
            <Badge
              variant={isSigned ? "outline" : candidate.contract_status === 'rejected' ? "destructive" : "secondary"}
              className={isSigned ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
            >
              {isSigned ? <><ShieldCheck className="w-3 h-3 mr-1" /> {t("candidates.detail.contract_signed")}</> :
                candidate.contract_status === 'rejected' ? t("candidates.detail.contract_rejected") :
                  t("candidates.detail.pending_signature")}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(!isSigned && candidate.contract_status === 'pending') ? (
            <Link href={`/dashboard/candidates/${candidate.id}/sign`}>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 text-xs h-9">
                <PenToolIcon className="w-3.5 h-3.5 mr-2" />
                {t("candidates.detail.sign_contract")}
              </Button>
            </Link>
          ) : (
            <Link href={`/dashboard/candidates/${candidate.id}/sign`}>
              <Button variant="outline" className="text-xs h-9 border-slate-200">
                <Eye className="w-3.5 h-3.5 mr-2" />
                {t("candidates.detail.view_contract")}
              </Button>
            </Link>
          )}

          <Button variant="outline" className="text-xs h-9 border-slate-200" onClick={() => setIsEmailOpen(true)}>
            <Mail className="w-3.5 h-3.5 mr-2" />
            Email
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {!isEditing ? (
            <Button variant="secondary" className="text-xs h-9" onClick={() => setIsEditing(true)}>
              <Edit className="w-3.5 h-3.5 mr-2" />
              Edit Data
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-xs h-9" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs h-9" onClick={handleUpdate} disabled={isSaving}>
                {isSaving ? "Saving..." : <><Save className="w-3.5 h-3.5 mr-2" /> Save Changes</>}
              </Button>
            </div>
          )}
        </div>
      </div>

      <EmailEditorDialog
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        recipients={[candidate.email]}
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN: TEXT DATA */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm ring-1 ring-slate-100">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-500" />
                  Candidate Profile Details
                </CardTitle>
                <CardDescription>
                  All dynamic data submitted through the application form.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {textFields.length > 0 ? (
                    textFields.map(([key, value]) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        {isEditing ? (
                          <Input
                            value={String(value || '')}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                            className="h-9 focus:ring-1 focus:ring-blue-500 bg-background"
                          />
                        ) : (
                          <div className="h-9 flex items-center px-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-md border border-transparent text-sm font-semibold text-foreground">
                            {String(value || '-')}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-12 text-center text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>{t("candidates.detail.no_dynamic_fields")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contracts History or similar could go here */}
            {candidate.generated_contracts?.length > 0 && (
              <Card className="border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                <CardHeader>
                  <CardTitle className="text-base">{t("candidates.detail.document_history")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {candidate.generated_contracts.map((gc: any) => (
                    <div key={gc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card group hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-100 dark:text-blue-900 fill-blue-50 dark:fill-blue-900/20" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{gc.form_contract?.name || "Contract"}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(gc.generated_at), 'PPP p')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`${axios.defaults.baseURL}/api/generated-contracts/${gc.id}/download`} download className="text-blue-600">
                          <Download className="w-4 h-4 mr-1" /> PDF
                        </a>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* IDENTITY VERIFICATION (DIDIT) */}
            {kycData && (
              <Card className="border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
                <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      {t("candidates.detail.verification_report")}
                    </CardTitle>
                    <Badge className={kycData.status === 'Approved' ? 'bg-emerald-500' : 'bg-yellow-500'}>
                      {t(`candidates.detail.status.${kycData.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                  <CardDescription>{t("candidates.detail.verified_data")}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Summary of Checks */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {kycData.features.map((feature: string) => (
                      <div key={feature} className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{feature.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main Verified Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* ID Details */}
                    <div className="space-y-6">
                      {kycData.id_verifications?.[0] && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                          <DetailItem label="Verified Full Name" value={kycData.id_verifications[0].full_name} />
                          <DetailItem label="Date of Birth" value={kycData.id_verifications[0].date_of_birth} />
                          <DetailItem label="Nationality" value={kycData.id_verifications[0].issuing_state_name} />
                          <DetailItem label="Document ID" value={`${kycData.id_verifications[0].document_type} (${kycData.id_verifications[0].document_number})`} />
                          <DetailItem label="Verified Address" value={kycData.id_verifications[0].formatted_address} colSpan={2} />
                        </div>
                      )}

                      {/* AML Alerts */}
                      {kycData.aml_screenings?.[0]?.total_hits > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30 space-y-2">
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">{t("candidates.detail.aml_alert")}</span>
                          </div>
                          <p className="text-xs text-red-600 dark:text-red-500">
                            Detected {kycData.aml_screenings[0].total_hits} hit(s) in PEP/watchlist databases.
                          </p>
                        </div>
                      )}

                      {/* Contact Details */}
                      {kycData.phone_verifications?.[0] && (
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full">
                              <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">{t("candidates.detail.verified_phone")}</p>
                              <p className="text-sm font-bold text-foreground">{kycData.phone_verifications[0].full_number}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-none text-[10px]">VERIFIED</Badge>
                        </div>
                      )}
                    </div>

                    {/* ID Images */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{t("candidates.detail.verification_evidence")}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {kycData.id_verifications?.[0]?.front_image && (
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-bold text-slate-500 px-1">{t("candidates.detail.id_front")}</p>
                            <div className="group relative aspect-video rounded-md border bg-muted overflow-hidden cursor-pointer" onClick={() => window.open(kycData.id_verifications[0].front_image, '_blank')}>
                              <img src={kycData.id_verifications[0].front_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ExternalLink className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </div>
                        )}
                        {kycData.id_verifications?.[0]?.back_image && (
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-bold text-slate-500 px-1">{t("candidates.detail.id_back")}</p>
                            <div className="group relative aspect-video rounded-md border bg-muted overflow-hidden cursor-pointer" onClick={() => window.open(kycData.id_verifications[0].back_image, '_blank')}>
                              <img src={kycData.id_verifications[0].back_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ExternalLink className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-card rounded-lg border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                        {kycData.id_verifications?.[0]?.portrait_image ? (
                          <img src={kycData.id_verifications[0].portrait_image} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md ring-1 ring-slate-100 dark:ring-slate-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <UserCheck className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{t("candidates.detail.liveness_check")}</p>
                          <p className="text-[9px] text-slate-400">Status: {kycData.liveness_checks?.[0]?.status || t("candidates.detail.status.pending")}</p>
                        </div>
                        <div className="ml-auto">
                          <Badge className="bg-emerald-500 h-5 text-[9px] text-white border-none">PASSED</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* IP & Metadata Footer */}
                  <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6 opacity-90">
                    {kycData.ip_analyses?.[0] && (
                      <>
                        <DetailItem label="Verification IP" value={kycData.ip_analyses[0].ip_address} />
                        <DetailItem label="City / Region" value={`${kycData.ip_analyses[0].ip_city}, ${kycData.ip_analyses[0].ip_state}`} />
                        <DetailItem label="Device Info" value={`${kycData.ip_analyses[0].device_brand} ${kycData.ip_analyses[0].device_model} (${kycData.ip_analyses[0].os_family})`} />
                        <DetailItem label="Browser" value={kycData.ip_analyses[0].browser_family} />
                      </>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between text-[9px] text-muted-foreground font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded border dark:border-slate-800">
                    <span>DIDIT SESSION: {kycData.session_id}</span>
                    <span>TIMESTAMP: {format(new Date(kycData.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: MEDIA & FILES */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-purple-500" />
                  {t("candidates.detail.attachments")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {mediaFields.length > 0 ? (
                  <div className="flex flex-col">
                    {mediaFields.map(([key, value]) => {
                      const isImage = value.type?.startsWith('image/');
                      const path = value.path;
                      const fullPath = `${axios.defaults.baseURL}/api/candidates/files?path=${encodeURIComponent(path)}`;

                      return (
                        <div key={key} className="p-4 border-b last:border-b-0 dark:border-slate-800 group">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            <div className="flex gap-2">

                              <a href={fullPath} download={value.name} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-blue-600 transition-colors">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>

                          <div className="relative aspect-video rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                            {isImage ? (
                              <img src={fullPath} alt={key} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <FileText className="w-10 h-10 opacity-50" />
                                <p className="text-[10px] font-medium max-w-[150px] truncate">{value.name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>{t("candidates.detail.no_attachments")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-blue-600 dark:bg-blue-700 text-white border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-blue-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> {t("candidates.detail.quick_help")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-100/90 leading-relaxed">
                {t("candidates.detail.quick_help_text")}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value, colSpan = 1 }: { label: string, value: any, colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{String(value || '-')}</p>
    </div>
  )
}

