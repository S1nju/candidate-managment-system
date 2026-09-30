"use client"

import type React from "react"

import { useState, useEffect } from "react"
import axios from "@/lib/axios"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/context/language-context"

interface UserProfile {
  name: string
  email: string
  avatar: string
  bio?: string
}

export default function ProfilePage() {
  const { user, mutate } = useAuth({ middleware: "auth" })
  const { toast } = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    avatar: "",
    bio: "",
  })

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
        avatar: "", // Placeholder for now or add avatar support if available
        bio: user.bio || "",
      })
      setLoading(false)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await axios.put('/api/profile', profile)

      // Refresh user data
      await mutate()

      toast({
        title: t("profile.toast_title"),
        description: t("profile.toast_description"),
      })
    } catch (error: any) {
      toast({
        title: t("profile.error_title"),
        description: error.response?.data?.message || t("profile.error_generic"),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = profile.name
    ? profile.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : "U"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("profile.title")}</h1>
        <p className="text-muted-foreground">{t("profile.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.card_title")}</CardTitle>
          <CardDescription>{t("profile.card_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{t("profile.photo_label")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.photo_desc")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t("profile.name_label")}</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder={t("profile.name_placeholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("profile.email_label")}</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder={t("profile.email_placeholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t("profile.bio_label")}</Label>
              <Input
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder={t("profile.bio_placeholder")}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? t("profile.saving") : t("profile.save_changes")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
