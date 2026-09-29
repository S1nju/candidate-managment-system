const FIRST_NAME_RE = /pr[eé]nom|first[\s_-]?name|given[\s_-]?name/i

/**
 * Display name = first name + last name. The first name comes from the form
 * field whose label/name looks like "prénom"; falls back to `candidate.name`
 * alone when the form has no such field or the value is empty.
 */
export function getCandidateDisplayName(candidate: any): string {
  const lastName: string = (candidate?.name ?? "").toString().trim()
  const fields: any[] = candidate?.form?.fields ?? []
  const firstField = fields.find(
    (f) => FIRST_NAME_RE.test(f?.label ?? "") || FIRST_NAME_RE.test(f?.name ?? ""),
  )
  // Fall back to scanning the stored data keys when the form fields aren't loaded
  const dataKey = firstField?.name ?? Object.keys(candidate?.data ?? {}).find((k) => FIRST_NAME_RE.test(k))
  const raw = dataKey ? candidate?.data?.[dataKey] : undefined
  const firstName = (Array.isArray(raw) ? raw.join(" ") : (raw ?? "")).toString().trim()

  if (!firstName) return lastName
  if (!lastName) return firstName
  return lastName.toLowerCase().includes(firstName.toLowerCase()) ? lastName : `${firstName} ${lastName}`
}
