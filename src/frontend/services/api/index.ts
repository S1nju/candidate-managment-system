import authApi from "./auth.api"
import candidatesApi from "./candidates.api"
import formsApi from "./forms.api"
import usersApi from "./users.api"
import signingApi from "./signing.api"
import analyticsApi from "./analytics.api"
import auditApi from "./audit.api"
import notificationsApi from "./notifications.api"
import { apiClient } from "./client"

export const api = {
  auth: authApi,
  candidates: candidatesApi,
  forms: formsApi,
  users: usersApi,
  signing: signingApi,
  analytics: analyticsApi,
  audit: auditApi,
  notifications: notificationsApi,
  client: apiClient,
}

export {
  authApi,
  candidatesApi,
  formsApi,
  usersApi,
  signingApi,
  analyticsApi,
  auditApi,
  notificationsApi,
  apiClient,
}

export default api
