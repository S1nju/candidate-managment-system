"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { useLanguage } from "@/context/language-context"

export default function SettingsPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReport: true,
    newsletter: false,
  })

  const handleSave = () => {
    // In production, save to backend via axiosClient
    toast({
      title: t("settings.toast_title"),
      description: t("settings.toast_description"),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.appearance.title")}</CardTitle>
            <CardDescription>{t("settings.appearance.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">{t("settings.appearance.theme_label")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.appearance.theme_desc")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
                  {t("settings.appearance.light")}
                </Button>
                <Button size="sm" variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
                  {t("settings.appearance.dark")}
                </Button>
                <Button
                  size="sm"
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                >
                  {t("settings.appearance.system")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.notifications.title")}</CardTitle>
            <CardDescription>{t("settings.notifications.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">{t("settings.notifications.email_label")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.notifications.email_desc")}</p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">{t("settings.notifications.push_label")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.notifications.push_desc")}</p>
              </div>
              <Switch
                id="push-notifications"
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-report">{t("settings.notifications.weekly_label")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.notifications.weekly_desc")}</p>
              </div>
              <Switch
                id="weekly-report"
                checked={settings.weeklyReport}
                onCheckedChange={(checked) => setSettings({ ...settings, weeklyReport: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="newsletter">{t("settings.notifications.newsletter_label")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.notifications.newsletter_desc")}</p>
              </div>
              <Switch
                id="newsletter"
                checked={settings.newsletter}
                onCheckedChange={(checked) => setSettings({ ...settings, newsletter: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.danger_zone.title")}</CardTitle>
            <CardDescription>{t("settings.danger_zone.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
              <div className="space-y-0.5">
                <Label>{t("settings.danger_zone.delete_account_label")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.danger_zone.delete_account_desc")}</p>
              </div>
              <Button variant="destructive" size="sm">
                {t("settings.danger_zone.delete_button")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>{t("settings.save_button")}</Button>
        </div>
      </div>
    </div>
  )
}
