import apiClient from "./client"

export const auditApi = {
  async getAuditLogs(params?: Record<string, any>) {
    const response = await apiClient.get("/api/audit-logs", { params })
    return response.data
  },

  async getAuditFilters() {
    const response = await apiClient.get("/api/audit-logs/filters")
    return response.data
  },
}

export default auditApi
