"use client"

import useSWR from "swr"
import axios from "@/lib/axios"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export const useAuth = ({ middleware, redirectIfAuthenticated }: { middleware?: "guest" | "auth", redirectIfAuthenticated?: string } = {}) => {
  const router = useRouter()

  const { data: user, error, mutate } = useSWR("/api/user", () =>
    axios.get("/api/user").then((res) => res.data).catch((error) => {
      if (error.response.status !== 409) throw error

      router.push("/verify-email")
    })
  )

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
      await axios.post("/api/logout").then(() => mutate())
    }

    router.push("/login")
  }

  useEffect(() => {
    if (middleware === "guest" && redirectIfAuthenticated && user) router.push(redirectIfAuthenticated)
    if (middleware === "auth" && error) logout()
  }, [user, error])

  return {
    user,
    mutate,
    login,
    register,
    logout,
  }
}
