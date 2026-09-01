import apiClient from "./client"

export const analyticsApi = {
  async getCandidateAnalytics(year?: number) {
    const response = await apiClient.get("/api/analytics/candidates", {
      params: year ? { year } : undefined,
    })
    return response.data
  },
}

export default analyticsApi
