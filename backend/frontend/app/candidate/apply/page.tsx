"use client"
import React, { useState } from "react"
import axios from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function CandidateApplyPage() {
  const [form, setForm] = useState<{
    email: string
    gender: string
    name: string
    nationality: string
    dob: string
    address: string
    social_security_number: string
    phone: string
    emergency_phone: string
    recruitment_city: string
    animator_name: string
    product_justcost: string
    contract_type: string
    start_date: string
    photo: File | null
    cv: File | null
  }>({
    email: "",
    gender: "",
    name: "",
    nationality: "",
    dob: "",
    address: "",
    social_security_number: "",
    phone: "",
    emergency_phone: "",
    recruitment_city: "",
    animator_name: "",
    product_justcost: "",
    contract_type: "",
    start_date: "",
    photo: null,
    cv: null,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Basic validation
    if (form.social_security_number.length !== 15) {
      setError("Le Numéro de Sécurité Sociale doit contenir exactement 15 chiffres.")
      setLoading(false)
      return
    }

    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value)
      }
    })

    try {
      // Changed endpoint to store directly (verify-identity might be different flow, assuming direct store for now or verify needs photo?)
      // If flow is verify -> sign -> store, we might need to adjust.
      // But user asked for photo upload. Assuming we are using identity-verification controller or candidate controller.
      // The original used /api/candidates/verify-identity. Let's keep it but check if it handles files.
      // IdentityVerificationController probably expects JSON.
      // We might need to change it to multipart/form-data.

      const response = await axios.post("/api/candidates/verify-identity", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.url) {
        // Redirect to Didit verification
        window.location.href = response.data.url
      } else {
        throw new Error("Impossible de générer la session de vérification.")
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || "Une erreur est survenue lors de l'envoi du formulaire.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex justify-center">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-primary">Bienvenue chez vous !</CardTitle>
          <CardDescription className="text-lg">
            Merci de remplir le formulaire ci-dessous. Votre identité sera vérifiée avant de finaliser votre inscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Adresse e-mail*</Label>
                <Input id="email" name="email" type="email" placeholder="nomdutilisateur@example.com" value={form.email} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label>Genre*</Label>
                <Select onValueChange={(val) => handleSelectChange("gender", val)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Sélectionner --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homme">Homme</SelectItem>
                    <SelectItem value="Femme">Femme</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="photo">Photo (Optionnel)</Label>
                <Input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setForm({ ...form, photo: e.target.files[0] })
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Format accepté : JPG, PNG. Max 2MB.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cv">CV (PDF/Word)</Label>
                <Input
                  id="cv"
                  name="cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setForm({ ...form, cv: e.target.files[0] })
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Format accepté : PDF, DOC, DOCX. Max 5MB.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">NOM et Prénom*</Label>
                <div className="text-xs text-muted-foreground mb-1">Merci de bien mettre votre NOM en premier et en majuscule</div>
                <Input id="name" name="name" placeholder="DUPONT Jean" value={form.name} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label>Nationalité*</Label>
                <Select onValueChange={(val) => handleSelectChange("nationality", val)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Sélectionner --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Française">Française</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dob">Date de naissance*</Label>
                <div className="text-xs text-muted-foreground mb-1">Veuillez utiliser le format jj/mm/aaaa</div>
                <Input id="dob" name="dob" type="date" value={form.dob} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Adresse postale*</Label>
                <div className="text-xs text-muted-foreground mb-1">Numéro, rue, code postal, ville</div>
                <Input id="address" name="address" placeholder="10 Rue de la Paix, 75000 Paris" value={form.address} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="social_security_number">Numéro de Sécurité Sociale*</Label>
                <div className="text-xs text-muted-foreground mb-1">Renseignez les 15 chiffres, sans espaces !</div>
                <Input id="social_security_number" name="social_security_number" maxLength={15} placeholder="18501..." value={form.social_security_number} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Votre numéro de téléphone*</Label>
                <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emergency_phone">Numéro à contacter en cas d'urgence*</Label>
                <Input id="emergency_phone" name="emergency_phone" type="tel" value={form.emergency_phone} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="recruitment_city">Ville où vous avez recruté*</Label>
                <Input id="recruitment_city" name="recruitment_city" value={form.recruitment_city} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="animator_name">Nom et Prénom de votre/vos animateur(s) réseau*</Label>
                <Input id="animator_name" name="animator_name" value={form.animator_name} onChange={handleChange} required />
              </div>

              <div className="grid gap-2">
                <Label>PRODUIT JUSTCOST*</Label>
                <Select onValueChange={(val) => handleSelectChange("product_justcost", val)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Sélectionner --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE STRATYGO">FREE STRATYGO</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Type de contrat JUSTCOST*</Label>
                <Select onValueChange={(val) => handleSelectChange("contract_type", val)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Sélectionner --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                    <SelectItem value="Stage">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="start_date">Date de commencement*</Label>
                <div className="text-xs text-muted-foreground mb-1">Veuillez utiliser le format jj/mm/aaaa</div>
                <Input id="start_date" name="start_date" type="date" value={form.start_date} onChange={handleChange} required />
              </div>

            </div>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm font-medium">{error}</div>}

            <Button type="submit" className="w-full text-lg py-6" disabled={loading}>
              {loading ? "Préparation de la vérification..." : "Vérifier mon identité et m'inscrire"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
