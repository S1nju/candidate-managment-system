"use client"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CandidateApplySuccessPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="size-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl text-green-600">Inscription Réussie !</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg">
                        Merci ! Votre identité a été vérifiée et votre formulaire a été enregistré avec succès.
                    </p>
                    <p className="text-muted-foreground">
                        Nous allons maintenant traiter votre dossier. Vous recevrez prochainement votre contrat par e-mail.
                    </p>
                    <div className="pt-4">
                        <Button asChild className="w-full">
                            <Link href="/">Retour à l'accueil</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
