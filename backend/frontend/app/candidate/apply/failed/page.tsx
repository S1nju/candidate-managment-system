"use client"
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function CandidateApplyFailedPage() {
    const searchParams = useSearchParams()
    const status = searchParams.get("status") || "Échec"

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md text-center border-red-200">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <XCircle className="size-16 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl text-red-600">La vérification a échoué</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg">
                        Désolé, nous n'avons pas pu vérifier votre identité ({status}).
                    </p>
                    <p className="text-muted-foreground">
                        Veuillez vous assurer que vos documents sont lisibles et correspondent aux informations saisies.
                    </p>
                    <div className="pt-4 grid gap-2">
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/candidate/apply">Réessayer</Link>
                        </Button>
                        <Button asChild variant="ghost" className="w-full">
                            <Link href="/">Retour à l'accueil</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
