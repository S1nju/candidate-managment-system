<?php

namespace App\Modules\Signing\Services;

use App\Modules\Documents\Models\Document;
use App\Modules\Signing\Models\DocumentSignature;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Support\Facades\Log;

use App\Modules\Audit\Services\AuditService;

use App\Modules\Notifications\Notifications\DocumentSignedNotification;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Storage;

class SigningService
{
    public function __construct(protected AuditService $auditService) {}

    public function signDocument(Document $document, User $user, array $data): DocumentSignature
    {
        // Log::info('signDocument received data', $data);

        // Allow signing if status is 'sent' OR if status is 'draft' and user is the owner
        $canSign = ($document->status === 'sent' && $document->assigned_to === $user->id) || 
                   ($document->status === 'draft' && $document->owner_id === $user->id);

        if (!$canSign) {
            if ($document->status === 'draft' && $document->owner_id !== $user->id) {
                throw new Exception("Only the owner can sign a draft document.");
            }
            if ($document->status === 'signed') {
                throw new Exception("Document is already signed.");
            }
            throw new Exception("Document cannot be signed (Status: {$document->status}) or you are not authorized.");
        }

        return DB::transaction(function () use ($document, $user, $data) {
            // Save all signatures as overlays
            $overlays = $data['signatures'] ?? [];

            $signature = DocumentSignature::create([
                'document_id' => $document->id,
                'user_id' => $user->id,
                'signature_type' => $overlays[0]['type'] ?? null, // Use first signature for legacy fields
                'signature_value' => $overlays[0]['value'] ?? null,
                'ip_address' => $data['ip_address'] ?? null,
                'user_agent' => $data['user_agent'] ?? null,
                'signed_at' => now(),
                'overlays' => json_encode($overlays),
            ]);

            // Create a "Signed" version of the file.
            $originalPath = $document->file_path;
            $signedPath = 'documents/signed/' . basename($originalPath);
            
            // Embed all signatures into PDF
            $this->embedSignatures($document, $overlays);

            // Create a NEW document record for the signed version
            $signedDocument = Document::create([
                'title' => $document->title . ' (Signed)',
                'description' => $document->description,
                'file_path' => $signedPath,
                'status' => 'signed',
                'owner_id' => $document->owner_id,
                'assigned_to' => $document->assigned_to,
                'signed_at' => now(),
            ]);

            // Update original document status if it wasn't already signed
            $document->update([
                'status' => 'signed',
                'signed_at' => now(),
            ]);

            $this->auditService->log('document_signed', $signedDocument, [
                'signature_id' => $signature->id,
                'original_document_id' => $document->id
            ]);

            if ($document->owner) {
                $document->owner->notify(new DocumentSignedNotification($signedDocument));
            }

            return $signature;
        });
    }

    // Embed multiple overlays (signatures) into the PDF
    protected function embedSignatures(Document $document, array $overlays): void
    {
        try {
            $originalPath = storage_path('app/secure/' . $document->file_path);
            $signedPath = storage_path('app/secure/documents/signed/' . basename($document->file_path));
            if (!file_exists(dirname($signedPath))) {
                mkdir(dirname($signedPath), 0755, true);
            }
            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->SetMargins(0, 0, 0);
            $pdf->SetAutoPageBreak(false);
            $pageCount = $pdf->setSourceFile($originalPath);
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $pdf->importPage($pageNo);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height'], true);
                // Place overlays for this page
                foreach ($overlays as $overlay) {
                    if (isset($overlay['placement']['page']) && $overlay['placement']['page'] === $pageNo) {
                        $x = ($overlay['placement']['x'] / 100) * $size['width'];
                        $y = ($overlay['placement']['y'] / 100) * $size['height'];
                        if ($overlay['type'] === 'image') {
                            $imageData = explode(',', $overlay['value']);
                            $imageBinary = base64_decode(count($imageData) > 1 ? $imageData[1] : $imageData[0]);
                            $pdf->Image('@'.$imageBinary, $x - 20, $y - 10, 40, 0, 'PNG');
                        } else {
                            $pdf->SetFont('courier', 'B', 16);
                            $pdf->SetXY($x - 20, $y - 5);
                            $pdf->Cell(40, 10, $overlay['value'], 0, 0, 'C');
                        }
                    }
                }
            }
            $pdf->Output($signedPath, 'F');
        } catch (\Exception $e) {
            Log::error("Error in embedSignatures: " . $e->getMessage());
            throw $e;
        }
    }

    public function rejectDocument(Document $document, User $user, string $reason): void
    {
        if ($document->assigned_to !== $user->id) {
            throw new Exception("You are not assigned to reject this document.");
        }

        $document->update([
            'status' => 'rejected',
        ]);

        $this->auditService->log('document_rejected', $document, ['reason' => $reason]);
    }
}
