import axios, { AxiosInstance, AxiosRequestConfig } from "axios"
import Cookies from "js-cookie"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  withXSRFToken: true,
})

// Automatically append Sanctum CSRF token if present
apiClient.interceptors.request.use((config) => {
  const xsrfToken = Cookies.get("XSRF-TOKEN")
  if (xsrfToken) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken)
  }
  return config
})

// Global response error interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // Handle unauthenticated user redirect safely
      }
    }
    return Promise.reject(error)
  }
)

export const fetchCsrfToken = async (): Promise<void> => {
  await apiClient.get("/sanctum/csrf-cookie")
}

export default apiClient
