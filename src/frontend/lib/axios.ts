import axios from "axios"

let baseURL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"

// Ensure baseURL has a protocol to prevent browser relative URL interpretation
if (baseURL && !baseURL.startsWith('http')) {
  baseURL = `https://${baseURL}`
}

// Remove trailing slash to prevent double slashes when combined with paths like /api
if (baseURL.endsWith('/')) {
  baseURL = baseURL.slice(0, -1)
}

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true,
})

// Add interceptor to include XSRF token from cookie
axiosClient.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]

  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token)
  }

  return config
})

export default axiosClient
