"use client"

import useSWR from "swr"
import axios from "@/lib/axios"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
export const useAuth = ({ middleware, redirectIfAuthenticated }: { middleware?: "guest" | "auth", redirectIfAuthenticated?: string } = {}) => {
  const router = useRouter()

  const { data: user, error, mutate } = useSWR("/api/user", null, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  })

  const csrf = () => axios.get("/sanctum/csrf-cookie")

  const login = async ({ setErrors, ...props }: any) => {
    await csrf()

    setErrors([])

    axios
      .post("/api/login", props)
      .then(() => {
        mutate()
        router.push("/dashboard")
      })
      .catch((error) => {
        if (error.response.status !== 422) throw error

        setErrors(error.response.data.errors)
      })
  }

  const register = async ({ setErrors, ...props }: any) => {
    await csrf()

    setErrors([])

    axios
      .post("/api/register", props)
      .then(() => {
        mutate()
        router.push("/dashboard")
      })
      .catch((error) => {
        if (error.response.status !== 422) throw error

        setErrors(error.response.data.errors)
      })
  }

  const logout = async () => {
    if (!error) {
      await axios.post("/api/logout").then(() => {
        Cookies.remove("XSRF-TOKEN")
        Cookies.remove("laravel_session")

        mutate()
        window.location.href = "/login"
      })
    }


  }

  const isLoading = !user && !error

  useEffect(() => {
    if (middleware === "guest" && redirectIfAuthenticated && user) router.push(redirectIfAuthenticated)
    // If auth is required and there is an error (unauthenticated), redirect to login directly
    if (middleware === "auth" && error) router.push("/login")
  }, [user, error, middleware, redirectIfAuthenticated, router])

  return {
    user,
    isLoading,
    mutate,
    login,
    register,
    logout,
  }
}
