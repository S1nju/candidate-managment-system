import apiClient from "./client"

export const notificationsApi = {
  async getNotifications() {
    const response = await apiClient.get("/api/notifications")
    return response.data
  },

  async markAsRead(id: number | string) {
    const response = await apiClient.post(`/api/notifications/${id}/read`)
    return response.data
  },

  async markAllAsRead() {
    const response = await apiClient.post("/api/notifications/read-all")
    return response.data
  },
}

export default notificationsApi
