"use client"

import React from "react"
import { useLanguage } from "@/context/language-context"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LanguagesIcon } from "lucide-react"

export function LanguageSwitcher() {
    const { language, setLanguage, t } = useLanguage()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full justify-start gap-2 px-2">
                    <LanguagesIcon className="size-4" />
                    <span className="text-sm font-medium">{language === "en" ? "English" : "Français"}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage("en")}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("fr")}>
                    Français
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
