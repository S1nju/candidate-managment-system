"use client"

import React, { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { XCircle, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { useLanguage } from "@/context/language-context"
import { translations } from "@/lib/translations"

function FailedContent() {
    const { t } = useLanguage()
    const searchParams = useSearchParams()
    const status = searchParams.get("status")

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-card rounded-2xl shadow-xl border p-8 text-center space-y-6"
            >
                <div className="flex justify-center">
                    <div className="p-4 bg-red-100 dark:bg-red-950/30 rounded-full">
                        <XCircle className="w-12 h-12 text-red-600 dark:text-red-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">{t("candidates.apply.failed_title")}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t("candidates.apply.failed_desc")}
                    </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 text-left flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-widest">{t("candidates.apply.failed_reason")}</p>
                        <p className="text-sm font-medium text-red-700 dark:text-red-500">{status || "Unknown error during verification session."}</p>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("candidates.apply.failed_note")}
                </p>

                <div className="pt-4 flex flex-col gap-3">
                    <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12"
                        onClick={() => window.history.back()}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t("candidates.apply.try_again")}
                    </Button>

                    <Link href="/">
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                            {t("candidates.apply.return_home")}
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-muted-foreground">
                    {t("candidates.apply.close_window")}
                </p>
            </motion.div>
        </div>
    )
}

export default function ApplicationFailedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background">{translations["en"].common.loading}</div>}>
            <FailedContent />
        </Suspense>
    )
}
