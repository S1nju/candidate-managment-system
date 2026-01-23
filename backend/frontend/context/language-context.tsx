"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { translations, Language } from "@/lib/translations"

type LanguageContextType = {
    language: Language
    setLanguage: (lang: Language) => void
    t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("fr") // Default to French as requested

    useEffect(() => {
        const saved = localStorage.getItem("language") as Language
        if (saved && (saved === "en" || saved === "fr")) {
            setLanguageState(saved)
        }
    }, [])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem("language", lang)
    }

    const t = (path: string): string => {
        const keys = path.split(".")
        let current: any = translations[language]

        for (const key of keys) {
            if (current[key] === undefined) {
                // Fallback to English if key missing in French
                let fallback: any = translations["en"]
                for (const fKey of keys) {
                    if (fallback[fKey] === undefined) return path
                    fallback = fallback[fKey]
                }
                return fallback
            }
            current = current[key]
        }

        return current
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
