import apiClient from "./client"

export const usersApi = {
  async updateProfile(data: { name?: string; email?: string }) {
    const response = await apiClient.put("/api/profile", data)
    return response.data
  },

  async changePassword(data: { current_password?: string; password: string; password_confirmation: string }) {
    const response = await apiClient.put("/api/change-password", data)
    return response.data
  },

  // Admin user routes
  admin: {
    async getUsers(params?: Record<string, any>) {
      const response = await apiClient.get("/api/admin/users", { params })
      return response.data
    },

    async getUser(id: number | string) {
      const response = await apiClient.get(`/api/admin/users/${id}`)
      return response.data
    },

    async createUser(data: Record<string, any>) {
      const response = await apiClient.post("/api/admin/users", data)
      return response.data
    },

    async updateUser(id: number | string, data: Record<string, any>) {
      const response = await apiClient.put(`/api/admin/users/${id}`, data)
      return response.data
    },

    async deleteUser(id: number | string) {
      const response = await apiClient.delete(`/api/admin/users/${id}`)
      return response.data
    },

    async restoreUser(id: number | string) {
      const response = await apiClient.post(`/api/admin/users/${id}/restore`)
      return response.data
    },

    async updateUserRoles(userId: number | string, roles: string[]) {
      const response = await apiClient.post(`/api/admin/users/${userId}/roles`, { roles })
      return response.data
    },

    async resetPassword(userId: number | string, password: string) {
      const response = await apiClient.post(`/api/admin/users/${userId}/reset-password`, { password })
      return response.data
    },

    async getRoles() {
      const response = await apiClient.get("/api/admin/roles")
      return response.data
    },

    async getPermissions() {
      const response = await apiClient.get("/api/admin/permissions")
      return response.data
    },
  },
}

export default usersApi
