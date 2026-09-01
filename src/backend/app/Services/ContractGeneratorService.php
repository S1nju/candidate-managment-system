<?php
namespace App\Services;

use App\Modules\Candidates\Models\Candidate;
use Illuminate\Support\Str;

class ContractGeneratorService
{
    public function generate(Candidate $candidate): string
    {
        $content = "CONTRAT DE TRAVAIL - JUSTCOST\n\n" .
            "ENTRE LES SOUSSIGNÉS:\n\n" .
            "L'Employeur: JUSTCOST\n" .
            "ET\n" .
            "Le Salarié: {$candidate->name}\n" .
            "Adresse: {$candidate->address}\n" .
            "Nationalité: {$candidate->nationality}\n" .
            "Date de naissance: " . ($candidate->dob ? $candidate->dob->format('d/m/Y') : '') . "\n" .
            "Numéro de Sécurité Sociale: {$candidate->social_security_number}\n\n" .
            "IL A ÉTÉ CONVENU CE QUI SUIT:\n\n" .
            "Article 1: Engagement\n" .
            "L'Employeur engage le Salarié en qualité de {$candidate->position} sous contrat {$candidate->contract_type}.\n\n" .
            "Article 2: Durée\n" .
            "Le contrat débute le " . ($candidate->start_date ? $candidate->start_date->format('d/m/Y') : '') . ".\n\n" .
            "Article 3: Lieu de travail\n" .
            "Le lieu de recrutement est {$candidate->recruitment_city}.\n\n" .
            "Article 4: Informations complémentaires\n" .
            "Email: {$candidate->email}\n" .
            "Téléphone: {$candidate->phone}\n" .
            "Contact d'urgence: {$candidate->emergency_phone}\n" .
            "Animateur: {$candidate->animator_name}\n" .
            "Produit: {$candidate->product_justcost}\n\n" .
            "Fait à {$candidate->recruitment_city}, le " . now()->format('d/m/Y') . "\n\n" .
            "Signature du Salarié:\n\n" .
            "_____________________\n";

        $filename = 'contracts/contract_' . $candidate->id . '_' . Str::random(8) . '.pdf';
        $path = storage_path('app/secure/' . $filename); // Assuming secure storage is used for docs, or match existing
        
        // Ensure directory exists
        if (!file_exists(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }

        $pdf = new \TCPDF();
        $pdf->SetPrintHeader(false);
        $pdf->SetPrintFooter(false);
        $pdf->AddPage();
        $pdf->SetFont('helvetica', '', 12);
        $pdf->MultiCell(0, 10, $content);
        $pdf->Output($path, 'F');

        return $filename;
    }
}
