"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth({ middleware: "auth" })
    const [showContent, setShowContent] = useState(false)

    useEffect(() => {
        if (user) {
            setShowContent(true)
        }
    }, [user])

    if (isLoading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return <>{children}</>
}
