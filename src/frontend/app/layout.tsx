import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SignMe",
  description: "SignMe",
  generator: "SignMe",
  icons: {
    icon: [
      {
        url: "/ezgif-82e9ad0fac9fff45.gif",
        media: "(prefers-color-scheme: light)",
      }
    ],
  },
}

import { LanguageProvider } from "@/context/language-context"
import { SWRProvider } from "@/components/swr-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SWRProvider>
            <LanguageProvider>
              {children}
              <Toaster />
            </LanguageProvider>
          </SWRProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
