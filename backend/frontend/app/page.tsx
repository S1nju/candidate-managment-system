"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "lucide-react"
import { useTheme } from "next-themes"

export default function HomePage() {
  const { theme, systemTheme } = useTheme()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  // Handle theme detection
  useEffect(() => {
    setMounted(true)
  }, [])

  // Track mouse movement for parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20 // -10 to 10
      const y = (e.clientY / window.innerHeight - 0.5) * 20 // -10 to 10
      setMousePosition({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Determine current theme
  const currentTheme = theme === "system" ? systemTheme : theme
  const videoSrc = currentTheme === "dark" ? "/6.mp4" : "/5.mp4"

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background Video with Mouse Parallax */}
      {mounted && (
        <video
          key={videoSrc} // Force re-render when theme changes
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px) scale(1.1)`,
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Semi-transparent Overlay (No blur) */}
      <div className="absolute bottom-10" />

      {/* Content */}
      <div className=" z-20  px-4 text-center">

      </div>

      {/* Subtle Bottom Accent */}
      <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 text-white/40 text-sm font-medium tracking-widest uppercase">

        <p className="mb-2 text-black animate-fade-in text-pretty text-xs font-medium  md:text-2sm [animation-delay:200ms] drop-shadow-lg">
          Secure, effortless document signing for modern teams.
        </p>
        <div className="flex justify-center animate-fade-in [animation-delay:400ms]">
          <Button asChild size="sm" className="h-6 px-12 text-xs font-bold rounded-full shadow-2xl hover:scale-105 transition-transform bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/dashboard">
              Go to the Dashboard
              <ArrowRightIcon className="ml-3 size-6" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
