"use client"


import DashboardAnalytics from "./analytics"


import { useLanguage } from "@/context/language-context"

export default function DashboardPage() {
	const { t } = useLanguage()
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
				<p className="text-muted-foreground">{t("dashboard.welcome")}</p>
			</div>
			<DashboardAnalytics />


		</div>
	)
}
