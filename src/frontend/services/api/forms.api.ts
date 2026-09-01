import apiClient from "./client"

export const formsApi = {
  async getForms() {
    const response = await apiClient.get("/api/forms")
    return response.data
  },

  async getForm(id: number | string) {
    const response = await apiClient.get(`/api/forms/${id}`)
    return response.data
  },

  async createForm(data: Record<string, any>) {
    const response = await apiClient.post("/api/forms", data)
    return response.data
  },

  async updateForm(id: number | string, data: Record<string, any>) {
    const response = await apiClient.put(`/api/forms/${id}`, data)
    return response.data
  },

  async deleteForm(id: number | string) {
    const response = await apiClient.delete(`/api/forms/${id}`)
    return response.data
  },

  async uploadCompletionAttachment(formId: number | string, file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await apiClient.post(`/api/forms/${formId}/completion-attachment`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },

  // Email contracts
  async getEmailContracts() {
    const response = await apiClient.get("/api/email-contracts")
    return response.data
  },

  async uploadEmailContractTemplate(file: File) {
    const formData = new FormData()
    formData.append("template", file)
    const response = await apiClient.post("/api/email-contracts/upload-template", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },

  async sendEmailContract(data: Record<string, any>) {
    const response = await apiClient.post("/api/email-contracts/send", data)
    return response.data
  },

  // Public form routes
  public: {
    async getPublicForm(uuid: string) {
      const response = await apiClient.get(`/api/public/forms/${uuid}`)
      return response.data
    },

    async submitPublicForm(uuid: string, data: FormData | Record<string, any>) {
      const response = await apiClient.post(`/api/public/forms/${uuid}/submit`, data, {
        headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {},
      })
      return response.data
    },
  },
}

export default formsApi
