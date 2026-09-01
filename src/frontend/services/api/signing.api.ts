import apiClient from "./client"

export const signingApi = {
  async getSignatures() {
    const response = await apiClient.get("/api/signatures")
    return response.data
  },

  async storeSignature(data: { signature_data: string; name?: string }) {
    const response = await apiClient.post("/api/signatures", data)
    return response.data
  },

  async uploadSignature(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await apiClient.post("/api/signatures/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },

  async deleteSignature(id: number | string) {
    const response = await apiClient.delete(`/api/signatures/${id}`)
    return response.data
  },

  async signDocument(documentId: number | string, signatureId: number | string) {
    const response = await apiClient.post(`/api/documents/${documentId}/sign`, {
      signature_id: signatureId,
    })
    return response.data
  },

  async verifySignatureHash(hash: string) {
    const response = await apiClient.get(`/api/public/signature/${encodeURIComponent(hash)}/verify`)
    return response.data
  },
}

export default signingApi

