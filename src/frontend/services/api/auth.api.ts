import apiClient, { fetchCsrfToken } from "./client"

export interface LoginCredentials {
  email?: string
  username?: string
  password?: string
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    await fetchCsrfToken()
    const response = await apiClient.post("/api/login", credentials)
    return response.data
  },

  async logout() {
    const response = await apiClient.post("/api/logout")
    return response.data
  },

  async getCurrentUser() {
    const response = await apiClient.get("/api/user")
    return response.data
  },
}

export default authApi
