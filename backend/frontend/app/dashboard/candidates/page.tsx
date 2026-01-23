"use client"

import { CandidateList } from "@/components/candidates/candidate-list"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/context/language-context"

export default function CandidatesPage() {
  useAuth({ middleware: "auth" })
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("candidates.title")}</h1>
          <p className="text-muted-foreground">
            {t("candidates.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Add Create Button if needed later
                    <Link href="/dashboard/candidates/create">
                        <Button>Create Candidate</Button>
                    </Link>
                    */}
        </div>
      </div>
      <CandidateList />
    </div>
  )
}
