"use client"

import React, { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { useLanguage } from "@/context/language-context"
import { translations } from "@/lib/translations"

function SuccessContent() {
    const { t } = useLanguage()
    const searchParams = useSearchParams()

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-card rounded-2xl shadow-xl border p-8 text-center space-y-6"
            >
                <div className="flex justify-center">
                    <div className="p-4 bg-emerald-100 dark:bg-emerald-950/30 rounded-full">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">{t("candidates.apply.success_title")}</h1>
                    <p className="text-muted-foreground text-lg">
                        {t("candidates.apply.success_desc")}
                    </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "{t("candidates.apply.success_note")}"
                </p>

                <div className="pt-4">
                    <Link href="/">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12">
                            {t("common.close")}
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

export default function ApplicationSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background">{translations["en"].common.loading}</div>}>
            <SuccessContent />
        </Suspense>
    )
}
