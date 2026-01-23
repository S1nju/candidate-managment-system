"use client"

import React, { use, useEffect, useState } from "react"
import useSWR from "swr"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  UserIcon, Mail, Phone, Calendar, MapPin,
  FileText, Briefcase, UserCheck, Activity,
  AlertCircle, CheckCircle2, FileCheck, PenToolIcon
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { useLanguage } from "@/context/language-context"

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { data: candidate, error, isLoading } = useSWR(`/api/candidates/${id}`, () => axios.get(`/api/candidates/${id}`).then(res => res.data))

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
            <Briefcase className="w-4 h-4" /> {candidate.position}
            <span className="text-slate-300">|</span>
            {candidate.contract_type}
          </p>
        </div>
        <div className="flex gap-2">
          {(!isSigned && candidate.contract_status === 'pending') ? (
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Info */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-blue-500" /> {t("candidates.detail.personal_info")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem label={t("candidates.detail.labels.email")} value={candidate.email} icon={<Mail className="w-4 h-4" />} />
              <InfoItem label={t("candidates.detail.labels.phone")} value={candidate.phone} icon={<Phone className="w-4 h-4" />} />
              <InfoItem label={t("candidates.detail.labels.dob")} value={candidate.dob ? format(new Date(candidate.dob), 'PP') : '-'} icon={<Calendar className="w-4 h-4" />} />
              <InfoItem label={t("candidates.detail.labels.nationality")} value={candidate.nationality} icon={<MapPin className="w-4 h-4" />} />
              <InfoItem label={t("candidates.detail.labels.ssn")} value={candidate.social_security_number} icon={<Activity className="w-4 h-4" />} />
              <InfoItem label={t("candidates.detail.labels.gender")} value={candidate.gender} icon={<UserCheck className="w-4 h-4" />} />
              <InfoItem label={t("candidates.detail.labels.address")} value={candidate.address} colSpan={2} icon={<MapPin className="w-4 h-4" />} />
              <InfoItem label={t("candidates.detail.labels.emergency_contact")} value={candidate.emergency_phone} colSpan={2} icon={<AlertCircle className="w-4 h-4" />} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-orange-500" /> {t("candidates.detail.employment_details")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem label={t("candidates.detail.labels.position")} value={candidate.position} />
              <InfoItem label={t("candidates.detail.labels.contract_type")} value={candidate.contract_type} />
              <InfoItem label={t("candidates.detail.labels.start_date")} value={candidate.start_date ? format(new Date(candidate.start_date), 'PP') : '-'} />
              <InfoItem label={t("candidates.detail.labels.recruitment_city")} value={candidate.recruitment_city} />
              <InfoItem label={t("candidates.detail.labels.animator")} value={candidate.animator_name} />
              <InfoItem label={t("candidates.detail.labels.product")} value={candidate.product_justcost} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Candidate Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Photo Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-purple-500" /> Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {candidate.photo_url ? (
                <img src={candidate.photo_url} alt={candidate.name} className="w-48 h-48 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <UserIcon className="w-24 h-24 text-slate-400" />
                </div>
              )}
            </CardContent>
          </Card>

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

function InfoItem({ label, value, icon, colSpan = 1 }: { label: string, value: string | number, icon?: React.ReactNode, colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
        {icon} {label}
      </div>
      <div className="text-base font-semibold text-slate-800 dark:text-slate-200">
        {value || "-"}
      </div>
    </div>
  )
}
