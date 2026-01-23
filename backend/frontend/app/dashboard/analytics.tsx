"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, CheckCircle2, Clock, XCircle } from "lucide-react"
import useSWR from "swr"
import axios from "@/lib/axios"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/context/language-context"
import { Line } from "react-chartjs-2"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function DashboardAnalytics() {
  const { t } = useLanguage()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useSWR(`/api/analytics/candidates?year=${selectedYear}`, () =>
    axios.get(`/api/analytics/candidates`, { params: { year: selectedYear } }).then(res => res.data)
  )

  if (isLoading || !analyticsData) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = analyticsData.current_stats
  const monthlyData = analyticsData.monthly_data
  const availableYears = analyticsData.available_years
  const now = new Date()

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: t("dashboard.trends.applications"),
        data: monthlyData.map((d: any) => d.applications),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t("dashboard.trends.signed"),
        data: monthlyData.map((d: any) => d.signed),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t("dashboard.trends.rejected"),
        data: monthlyData.map((d: any) => d.rejected),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4 text-blue-600" />
              {t("dashboard.stats.applications")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.this_month}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.stats.new_in").replace("{month}", now.toLocaleString(t("common.language") === "English" ? "en-US" : "fr-FR", { month: 'long' }))}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" />
              {t("dashboard.stats.signed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.signed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.stats.acceptance_rate").replace("{rate}", stats.acceptance_rate.toString())}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="size-4 text-yellow-600" />
              {t("dashboard.stats.unsigned")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.stats.awaiting_signature")}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="size-4 text-red-600" />
              {t("dashboard.stats.rejected")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.stats.total_candidates").replace("{total}", stats.total.toString())}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("dashboard.trends.title")}</CardTitle>
              <CardDescription>{t("dashboard.trends.description")}</CardDescription>
            </div>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("dashboard.trends.select_year")} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year: any) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
