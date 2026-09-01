<?php

namespace App\Modules\Forms\Services;

use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\Form;
use App\Modules\Forms\Models\FormContract;
use App\Modules\Forms\Models\GeneratedContract;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\TcpdfFpdi;

class ContractGenerationService
{
    /**
     * Generate all contracts for a candidate based on the form they submitted.
     */
    public function generateForCandidate(Candidate $candidate)
    {
        if (! $candidate->form_id) {
            return;
        }

        $form = Form::with('contracts')->find($candidate->form_id);
        if (! $form || $form->contracts->isEmpty()) {
            return;
        }

        foreach ($form->contracts as $contract) {
            try {
                $this->generateContract($candidate, $contract);
            } catch (\Exception $e) {
                Log::error("Failed to generate contract {$contract->id} for candidate {$candidate->id}: ".$e->getMessage());
            }
        }
    }

    /**
     * Generate a single contract using PDF overlay.
     */
    public function generateContract(Candidate $candidate, FormContract $formContract)
    {
        $content = $this->generateContent($candidate, $formContract);
        $fileName = 'generated_contracts/'.$candidate->id.'_'.$formContract->id.'_'.time().'.pdf';

        Storage::disk('secure')->put($fileName, $content);

        // Re-resolve data for snapshot (or return it from generateContent, but for now simple re-resolve is cheap)
        $data = $this->resolvePlaceholders($candidate, $formContract->placeholders);

        GeneratedContract::create([
            'candidate_id' => $candidate->id,
            'form_contract_id' => $formContract->id,
            'file_path' => $fileName,
            'data_snapshot' => $data,
            'generated_at' => now(),
        ]);
    }

    public function generateContent(Candidate $candidate, FormContract $formContract): string
    {
        try {
            $templatePath = $formContract->template_path; // Relative path on secure disk

            if (! Storage::disk('secure')->exists($templatePath)) {
                throw new \Exception("Template file not found at: {$templatePath}");
            }
            
            $fullPath = Storage::disk('secure')->path($templatePath);

            $data = $this->resolvePlaceholders($candidate, $formContract->placeholders);

            $pdf = new TcpdfFpdi;
            $pdf->SetAutoPageBreak(false); // CRITICAL: Prevent auto page breaks when placing elements near bottom
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            
            $pageCount = $pdf->setSourceFile($fullPath);

            // ... remainder of generation loop ...
            
    // [SKIP TO resolvePlaceholders modification]
    // I will do this in a separate chunk to be safe or use multi_replace if supported, but let's stick to single chunk per file if possible or just use ReplaceFileContent carefully.
    // Actually, I can't jump lines in ReplaceFileContent. I will do the SetAutoPageBreak first.

            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $pdf->importPage($pageNo);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height'], true);

                // Apply overlays for this page
                foreach ($formContract->placeholders as $mapping) {
                    // Use loose comparison for page number (string vs int)
                    if (! isset($mapping['position']) || $mapping['position']['page'] != $pageNo) {
                        continue;
                    }

                    $placeholder = $mapping['placeholder'];
                    $value = $data[$placeholder] ?? '';

                    // For images, we want to skip setup if empty
                    $isImageField = (isset($mapping['field_type']) && $mapping['field_type'] === 'image');

                    $xPercent = $mapping['position']['x'];
                    $yPercent = $mapping['position']['y'];
                    $wPercent = $mapping['position']['width'] ?? 0;

                    $x = ($xPercent / 100) * $size['width'];
                    $y = ($yPercent / 100) * $size['height'];
                    $w = ($wPercent / 100) * $size['width'];

                    $renderWidth = $w > 0 ? $w : 50;

                    $isImage = false;
                    if ($isImageField || (is_string($value) && (str_starts_with($value, 'data:image') || str_ends_with(strtolower($value), '.png') || str_ends_with(strtolower($value), '.jpg') || str_ends_with(strtolower($value), '.jpeg')))) {
                        $isImage = true;
                    }

                    if ($isImage) {
                        if (! empty($value)) {
                            $imageResult = $this->resolveImagePath($value);
                            $foundPath = $imageResult['path'];

                            try {
                                if ($foundPath && file_exists($foundPath)) {
                                    $pdf->Image($foundPath, $x, $y, $renderWidth, 0);
                                }
                            } catch (\Exception $e) {
                                Log::error('GenContract: Image embed error: '.$e->getMessage());
                            }

                            if ($imageResult['is_temp'] && $foundPath && file_exists($foundPath)) {
                                @unlink($foundPath);
                            }
                        }
                    } else {
                        if ($value || $value === '0') {
                            $pdf->SetFont('helvetica', 'B', 12);
                            $pdf->SetTextColor(0, 0, 0);
                            $pdf->SetXY($x, $y);
                            $pdf->Cell(0, 0, (string) $value, 0, 0, 'L');
                        }
                    }
                }
            }

            return $pdf->Output('', 'S');
        } catch (\Exception $e) {
            Log::error('CRITICAL: Contract generation failed: '.$e->getMessage()."\n".$e->getTraceAsString());
            throw $e;
        }
    }

    /**
     * Resolve image path from string (base64, storage URL, http link, or file path).
     */
    protected function resolveImagePath(string $value): array
    {
        // 1. Base64 Image
        if (str_starts_with($value, 'data:image')) {
            if (preg_match('/^data:image\/(\w+);base64,/', $value)) {
                $data = substr($value, strpos($value, ',') + 1);
                $decoded = base64_decode($data);
                if ($decoded !== false) {
                    $tempFile = tempnam(sys_get_temp_dir(), 'contract_img_b64');
                    file_put_contents($tempFile, $decoded);
                    return ['path' => $tempFile, 'is_temp' => true];
                }
            }
        }

        // 2. Storage URL / relative path
        if (str_contains($value, '/storage/')) {
            $parts = explode('/storage/', $value, 2);
            if (isset($parts[1])) {
                $candidatePath = storage_path('app/public/'.ltrim($parts[1], '/'));
                if (file_exists($candidatePath)) {
                    return ['path' => $candidatePath, 'is_temp' => false];
                }
            }
        }

        // 3. External HTTP(S) URL
        if (str_starts_with($value, 'http')) {
            try {
                $response = \Illuminate\Support\Facades\Http::timeout(5)->get($value);
                if ($response->successful()) {
                    $tempFile = tempnam(sys_get_temp_dir(), 'contract_img_http');
                    file_put_contents($tempFile, $response->body());
                    return ['path' => $tempFile, 'is_temp' => true];
                }
            } catch (\Exception $e) {
                Log::error('GenContract: Image download failed: '.$e->getMessage());
            }
        }

        // 4. Local File System Paths
        $possiblePaths = [
            storage_path('app/secure/'.$value),
            storage_path('app/'.$value),
            storage_path($value),
            public_path($value),
            $value,
        ];

        foreach ($possiblePaths as $testPath) {
            if (file_exists($testPath) && is_file($testPath)) {
                return ['path' => $testPath, 'is_temp' => false];
            }
        }

        return ['path' => null, 'is_temp' => false];
    }


    /**
     * Get resolved data for all contracts associated with a candidate's form.
     */
    public function getCandidateDataWithPlaceholders(Candidate $candidate): array
    {
        if (! $candidate->form_id) {
            return [];
        }

        $form = Form::with('contracts')->find($candidate->form_id);
        if (! $form || $form->contracts->isEmpty()) {
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

            if (! $placeholder) {
                continue;
            }

            // Fallback to placeholder name if field_name is empty
            $searchKey = $fieldName ?: $placeholder;
            // Strip {} if present from placeholder for search
            $cleanKey = str_replace(['{{', '}}'], '', $searchKey);

            switch ($source) {
                case 'form_field':
                    $value = $candidate->data[$fieldName] ?? $candidate->data[$cleanKey] ?? $candidate->data[$searchKey] ?? '';

                    // If we still don't have it, maybe try case-insensitive?
                    if (empty($value) && ! empty($candidate->data)) {
                        foreach ($candidate->data as $k => $v) {
                            if (strtolower($k) === strtolower($fieldName) || strtolower($k) === strtolower($cleanKey)) {
                                $value = $v;
                                break;
                            }
                        }
                    }

                    // Fallback: Check if it exists as a direct attribute on the candidate model (e.g. name, email)
                    if (empty($value)) {
                        $value = $candidate->{$fieldName} ?? $candidate->{$cleanKey} ?? $candidate->{$searchKey} ?? '';
                    }

                    // If it's a file object from dynamic form, we want the path for images
                    if (is_array($value) && isset($value['path'])) {
                        $value = $value['path'];
                    } elseif (is_array($value) && isset($value['name']) && ! isset($value['path'])) {
                        $value = $value['name'];
                    }
                    break;
                case 'candidate_data':
                    $value = $candidate->{$fieldName} ?? $candidate->{$searchKey} ?? '';
                    break;
                case 'didit_data':
                    // Fetch from verified data if available
                    $verifiedData = $candidate->data['verified_data'] ?? [];
                    $value = $verifiedData[$fieldName] ?? $verifiedData[$cleanKey] ?? '[Not Verified]';
                    break;
                case 'static_signature':
                    // Value is the direct path/URL to the signature image
                    $value = $mapping['value'] ?? '';
                    break;
                case 'system':
                    if ($searchKey === 'date' || $cleanKey === 'date') {
                        $value = date('Y-m-d');
                    } else {
                        $value = '';
                    }
                    break;
            }

            \Illuminate\Support\Facades\Log::info("GenContract: Resolved '{$placeholder}' (key: {$searchKey}) to value type: ".gettype($value));
            $resolved[$placeholder] = $value;
        }

        return $resolved;
    }
}
