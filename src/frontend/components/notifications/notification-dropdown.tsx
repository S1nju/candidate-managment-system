"use client"

import { BellIcon, CheckIcon, MailIcon, FileTextIcon } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import useSWR from "swr"
import axios from "@/lib/axios"
import { formatDistanceToNow } from "date-fns"
import { useLanguage } from "@/context/language-context"

interface Notification {
    id: string
    data: {
        message: string
        title?: string
        type?: string
    }
    read_at: string | null
    created_at: string
}

export function NotificationDropdown() {
    const { t } = useLanguage()
    const { data: response, mutate } = useSWR("/api/notifications", () =>
        axios.get("/api/notifications").then((res) => res.data)
    )

    const notifications = (response?.data as Notification[]) || []
    const unreadCount = notifications.filter((n) => !n.read_at).length

    const markAsRead = async (id: string) => {
        await axios.post(`/api/notifications/${id}/read`)
        mutate()
    }

    const markAllAsRead = async () => {
        await axios.post("/api/notifications/read-all")
        mutate()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted font-medium">
                    <BellIcon className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px] font-bold border-2 border-background"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none">{t("notifications.title")}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {t("notifications.unread_count").replace("{count}", unreadCount.toString())}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            {t("notifications.empty")}
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.read_at ? "bg-primary/5 dark:bg-primary/10" : ""
                                    }`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {notification.data.type === "document" ? (
                                            <FileTextIcon className="h-3 w-3 text-primary" />
                                        ) : (
                                            <MailIcon className="h-3 w-3 text-primary" />
                                        )}
                                        <span className="font-bold text-xs truncate">
                                            {notification.data.title || t("notifications.default_title")}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {notification.data.message}
                                </p>
                                {!notification.read_at && (
                                    <div className="mt-1 h-1 w-1 rounded-full bg-primary" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="w-full justify-center text-xs font-medium text-primary cursor-pointer"
                    onClick={markAllAsRead}
                >
                    <CheckIcon className="mr-2 h-3 w-3" />
                    {t("notifications.mark_all_read")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
