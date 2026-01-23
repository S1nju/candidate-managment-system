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
  const [form, setForm] = useState({
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
  })
  const [success, setSuccess] = useState(false)
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

    try {
      await axios.post("/api/candidates", form)
      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || "Une erreur est survenue lors de l'envoi du formulaire.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600">Bienvenue chez vous !</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>Merci ! Votre formulaire a été envoyé avec succès.</p>
            <p>Nous allons traiter votre dossier et générer votre contrat.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex justify-center">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-primary">Bienvenue chez vous !</CardTitle>
          <CardDescription className="text-lg">
            Merci de remplir le formulaire ci-dessous, afin d'établir votre contrat.
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
              {loading ? "Envoi en cours..." : "Valider mon inscription"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
