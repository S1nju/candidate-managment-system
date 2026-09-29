"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { UserIcon, FileTextIcon } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { getCandidateDisplayName } from "@/lib/candidate-name"

export function CandidateDetailCard({ candidate }: { candidate: any }) {
  const { t } = useLanguage()
  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-card border-slate-200 dark:border-slate-800">
      <div className="flex flex-col md:flex-row gap-6 items-start p-6">
        <div className="shrink-0 flex flex-col items-center gap-2">
          {candidate.cv_url ? (
            <img src={candidate.cv_url} alt="Candidate Photo" className="w-32 h-32 object-cover rounded-full border" />
          ) : (
            <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded-full border text-gray-400">
              <UserIcon className="w-12 h-12" />
            </div>
          )}
          {candidate.cv_url && (
            <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{t("candidates.detail.view_contract")}</a>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{getCandidateDisplayName(candidate)}</span>
            <Badge variant="outline">{candidate.position}</Badge>
          </div>
          <div className="text-muted-foreground text-sm">{candidate.email}</div>
          <div className="text-muted-foreground text-sm">{candidate.phone}</div>
          {candidate.data && (
            <div className="mt-2 space-y-1">
              {candidate.data.skills && <div><span className="font-bold">{t("candidates.detail.skills")}:</span> {Array.isArray(candidate.data.skills) ? candidate.data.skills.join(", ") : candidate.data.skills}</div>}
              {Object.keys(candidate.data).filter(k => k !== 'skills').map(key => (
                <div key={key}><span className="font-bold">{key}:</span> {String(candidate.data[key])}</div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Link href={`/dashboard/candidates/${candidate.id}/sign`}>
              <Button variant="default" size="sm" className="flex items-center gap-2">
                <FileTextIcon className="w-4 h-4" />
                {t("candidates.detail.sign_contract")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
