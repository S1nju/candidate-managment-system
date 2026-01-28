<?php

namespace App\Modules\Forms\Services;

use App\Modules\Forms\Models\Form;
use App\Modules\Forms\Models\FormContract;
use App\Modules\Forms\Models\GeneratedContract;
use App\Modules\Candidates\Models\Candidate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use setasign\Fpdi\TcpdfFpdi;

class ContractGenerationService
{
    /**
     * Generate all contracts for a candidate based on the form they submitted.
     */
    public function generateForCandidate(Candidate $candidate)
    {
        if (!$candidate->form_id) {
            return;
        }

        $form = Form::with('contracts')->find($candidate->form_id);
        if (!$form || $form->contracts->isEmpty()) {
            return;
        }

        foreach ($form->contracts as $contract) {
            try {
                $this->generateContract($candidate, $contract);
            } catch (\Exception $e) {
                Log::error("Failed to generate contract {$contract->id} for candidate {$candidate->id}: " . $e->getMessage());
            }
        }
    }

    /**
     * Generate a single contract using PDF overlay.
     */
    public function generateContract(Candidate $candidate, FormContract $formContract)
    {
        $templatePath = storage_path('app/secure/' . $formContract->template_path);
        
        if (!file_exists($templatePath)) {
            throw new \Exception("Template file not found at: {$templatePath}");
        }

        $data = $this->resolvePlaceholders($candidate, $formContract->placeholders);
        
        $pdf = new TcpdfFpdi();
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false);

        $pageCount = $pdf->setSourceFile($templatePath);

        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height'], true);

            // Apply overlays for this page
            foreach ($formContract->placeholders as $mapping) {
                if (!isset($mapping['position']) || $mapping['position']['page'] !== $pageNo) {
                    continue;
                }

                $placeholder = $mapping['placeholder'];
                $value = $data[$placeholder] ?? '';
                
                if (!$value) continue;

                $xPercent = $mapping['position']['x'];
                $yPercent = $mapping['position']['y'];

                $x = ($xPercent / 100) * $size['width'];
                $y = ($yPercent / 100) * $size['height'];

                // Simple text overlay for now. 
                // We can expand this to handle "signature" types (images) if needed.
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->SetTextColor(0, 0, 0);
                
                // Centering adjustment: assume the text point is the center
                $pdf->SetXY($x, $y);
                $pdf->Cell(0, 0, $value, 0, 0, 'L');
            }
        }

        $fileName = 'generated_contracts/' . $candidate->id . '_' . $formContract->id . '_' . time() . '.pdf';
        $content = $pdf->Output('', 'S');
        
        Storage::disk('secure')->put($fileName, $content);

        GeneratedContract::create([
            'candidate_id' => $candidate->id,
            'form_contract_id' => $formContract->id,
            'file_path' => $fileName,
            'data_snapshot' => $data,
            'generated_at' => now(),
        ]);
    }

    /**
     * Get resolved data for all contracts associated with a candidate's form.
     */
    public function getCandidateDataWithPlaceholders(Candidate $candidate): array
    {
        if (!$candidate->form_id) {
            return [];
        }

        $form = Form::with('contracts')->find($candidate->form_id);
        if (!$form || $form->contracts->isEmpty()) {
            return [];
        }

        $result = [];
        foreach ($form->contracts as $contract) {
            $result[] = [
                'contract_id' => $contract->id,
                'template_path' => $contract->template_path,
                'data' => $this->resolvePlaceholders($candidate, $contract->placeholders),
                'placeholders' => $contract->placeholders,
            ];
        }

        return $result;
    }

    /**
     * Resolve placeholders to actual values.
     */
    public function resolvePlaceholders(Candidate $candidate, ?array $mappings): array
    {
        if (empty($mappings)) {
            return [];
        }

        $resolved = [];
        foreach ($mappings as $mapping) {
            $value = '';
            $source = $mapping['source'] ?? '';
            $fieldName = $mapping['field_name'] ?? '';
            $placeholder = $mapping['placeholder'] ?? '';

            if (!$placeholder) continue;

            switch ($source) {
                case 'form_field':
                    $value = $candidate->data[$fieldName] ?? '';
                    if (is_array($value) && isset($value['name'])) {
                        $value = $value['name'];
                    }
                    break;
                case 'candidate_data':
                    $value = $candidate->{$fieldName} ?? '';
                    break;
                case 'didit_data':
                    // Fetch from verified data if available
                    $verifiedData = $candidate->data['verified_data'] ?? [];
                    $value = $verifiedData[$fieldName] ?? '[Not Verified]';
                    break;
            }

            $resolved[$placeholder] = $value;
        }

        return $resolved;
    }
}
