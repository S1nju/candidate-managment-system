import apiClient from "./client"

export interface CandidateQueryParams {
  search?: string
  status?: string
  form_id?: string | number
  source?: string
  per_page?: number
  page?: number
}

export const candidatesApi = {
  async getCandidates(params?: CandidateQueryParams) {
    const response = await apiClient.get("/api/candidates", { params })
    return response.data
  },

  async getCandidate(id: number | string) {
    const response = await apiClient.get(`/api/candidates/${id}`)
    return response.data
  },

  async createCandidate(data: FormData | Record<string, any>) {
    const response = await apiClient.post("/api/candidates", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
    })
    return response.data
  },

  async updateCandidate(id: number | string, data: Record<string, any>) {
    const response = await apiClient.put(`/api/candidates/${id}`, data)
    return response.data
  },

  async assignCandidate(id: number | string, assignedToUserId: number | null) {
    const response = await apiClient.post(`/api/candidates/${id}/assign`, {
      assigned_to: assignedToUserId,
    })
    return response.data
  },

  async createEmailContractInvite(data: { name: string; email: string; form_id: number }) {
    const response = await apiClient.post("/api/candidates/email-contracts", data)
    return response.data
  },

  async generateMailtoLink(candidateIds: number[]) {
    const response = await apiClient.post("/api/candidates/mailto", { candidate_ids: candidateIds })
    return response.data
  },

  async downloadFile(path: string) {
    const response = await apiClient.get("/api/candidates/files", {
      params: { path },
      responseType: "blob",
    })
    return response.data
  },

  // Contract operations
  async generateContract(candidateId: number | string, data?: Record<string, any>) {
    const response = await apiClient.post(`/api/candidates/${candidateId}/generate-contract`, data)
    return response.data
  },

  async previewContract(candidateId: number | string) {
    const response = await apiClient.get(`/api/candidates/${candidateId}/preview-contract`, {
      responseType: "blob",
    })
    return response.data
  },

  async getSigningStatus(candidateId: number | string) {
    const response = await apiClient.get(`/api/candidates/${candidateId}/signing-status`)
    return response.data
  },

  async acquireLock(candidateId: number | string) {
    const response = await apiClient.post(`/api/candidates/${candidateId}/acquire-lock`)
    return response.data
  },

  async releaseLock(candidateId: number | string) {
    const response = await apiClient.post(`/api/candidates/${candidateId}/release-lock`)
    return response.data
  },

  async pingLock(candidateId: number | string) {
    const response = await apiClient.post(`/api/candidates/${candidateId}/ping`)
    return response.data
  },

  async signContract(candidateId: number | string, signatureId: number) {
    const response = await apiClient.post(`/api/candidates/${candidateId}/sign-contract`, {
      signature_id: signatureId,
    })
    return response.data
  },

  async rejectContract(candidateId: number | string, reason?: string) {
    const response = await apiClient.post(`/api/candidates/${candidateId}/reject-contract`, { reason })
    return response.data
  },

  async sendSignatureRequest(candidateId: number | string) {
    const response = await apiClient.post(`/api/candidates/${candidateId}/send-signature-request`)
    return response.data
  },

  // Public candidate signing routes
  public: {
    async getCandidateByToken(token: string) {
      const response = await apiClient.get(`/api/public/candidate/${token}`)
      return response.data
    },

    async previewContractByToken(token: string) {
      const response = await apiClient.get(`/api/public/candidate/${token}/preview`, {
        responseType: "blob",
      })
      return response.data
    },

    async signContractByToken(token: string, data: { signature_data: string }) {
      const response = await apiClient.post(`/api/public/candidate/${token}/sign`, data)
      return response.data
    },
  },
}

export default candidatesApi
