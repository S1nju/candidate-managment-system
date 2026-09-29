"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOutIcon, UserIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/language-context"

export function UserNav() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await logout()
  }

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U"

  const seed = user.name || user.email || "U"
  const hue = Array.from(seed as string).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-full justify-start gap-2 px-2">
          <Avatar className="size-8">
            <AvatarFallback
              className="font-semibold text-white"
              style={{ backgroundColor: `hsl(${hue} 55% 42%)` }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start text-left text-sm">
            <span className="font-medium">{user.name || t("common.user_fallback")}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{user.email}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{user.name || t("common.user_fallback")}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile" className="cursor-pointer">
            <UserIcon className="mr-2 size-4" />
            {t("sidebar.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="cursor-pointer">
            <SettingsIcon className="mr-2 size-4" />
            {t("sidebar.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
          <LogOutIcon className="mr-2 size-4" />
          {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
