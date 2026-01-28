<?php

namespace App\Modules\Candidates\Services;

use App\Modules\Candidates\Models\Candidate;
use App\Modules\Signing\Models\Signature;
use App\Models\User;
use App\Modules\Audit\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use setasign\Fpdi\TcpdfFpdi;

class CandidateSigningService
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    public function signContract(Candidate $candidate, User $user, array $data): \App\Modules\Signing\Models\Signature
    {
        return DB::transaction(function () use ($candidate, $user, $data) {
            $overlays = $data['signatures'] ?? [];

            $candidate->load('generatedContracts');
            $latest = $candidate->generatedContracts->sortByDesc('generated_at')->first();

            if (!$latest) {
                throw new \Exception("No generated contract found for candidate.");
            }

            $originalPath = storage_path('app/secure/' . $latest->file_path);
            
            if (!file_exists($originalPath)) {
                throw new \Exception("Original contract file not found at: {$originalPath}");
            }

            $filename = basename($latest->file_path);
            $signedPath = storage_path('app/secure/generated_contracts/signed/' . $filename);
            
            if (!file_exists(dirname($signedPath))) {
                mkdir(dirname($signedPath), 0755, true);
            }

            // Embed signatures
            $this->embedSignatures($originalPath, $signedPath, $overlays);
            
            // Update candidate
            $candidate->update([
                'contract_status' => 'signed',
                'contract_path' => 'generated_contracts/signed/' . $filename,
            ]);

            $this->auditService->log('contract_signed', $candidate, [
                'filename' => $filename,
                'signed_path' => 'generated_contracts/signed/' . $filename
            ]);
            
            return true;
        });
    }

    protected function embedSignatures(string $sourcePath, string $destPath, array $overlays): void
    {
        $pdf = new TcpdfFpdi();
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false);
        
        $pageCount = $pdf->setSourceFile($sourcePath);
        
        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height'], true);
            
            foreach ($overlays as $overlay) {
                if (isset($overlay['placement']['page']) && $overlay['placement']['page'] === $pageNo) {
                    $x = ($overlay['placement']['x'] / 100) * $size['width'];
                    $y = ($overlay['placement']['y'] / 100) * $size['height'];
                    
                    if ($overlay['type'] === 'image' || $overlay['type'] === 'drawn') { // Adapt types
                         $val = $overlay['value'];
                         if (strpos($val, 'base64,') !== false) {
                            $imageData = explode('base64,', $val);
                            $imageBinary = base64_decode($imageData[1]);
                            $pdf->Image('@'.$imageBinary, $x - 20, $y - 10, 40, 0, 'PNG');
                         }
                    } else {
                        $pdf->SetFont('courier', 'B', 16);
                        $pdf->SetXY($x - 20, $y - 5);
                        $pdf->Cell(40, 10, $overlay['value'], 0, 0, 'C');
                    }
                }
            }
        }
        
        $pdf->Output($destPath, 'F');
    }
}
