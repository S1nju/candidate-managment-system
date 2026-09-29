<?php

namespace App\Modules\Forms\Services;

use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\Form;
use App\Modules\Forms\Models\FormContract;
use App\Modules\Forms\Models\GeneratedContract;
use App\Modules\Forms\Models\LibraryDocument;
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

    /**
     * Force-regenerate every unsigned contract of the candidate from the current
     * form/contract configuration. Contracts with any signature are left untouched.
     * Superseded unsigned PDFs are removed so the history keeps a single entry.
     *
     * @return array{regenerated: int, skipped_signed: int}
     */
    public function regenerateForCandidate(Candidate $candidate): array
    {
        $regenerated = 0;
        $skipped = 0;

        $candidate->loadMissing('form.contracts');

        foreach ($candidate->form?->contracts ?? [] as $contract) {
            $existing = GeneratedContract::where('candidate_id', $candidate->id)
                ->where('form_contract_id', $contract->id)
                ->get();

            if ($existing->contains(fn (GeneratedContract $gc) => $gc->hasAnySignature())) {
                $skipped++;

                continue;
            }

            $this->generateContract($candidate, $contract);
            $regenerated++;

            foreach ($existing as $old) {
                if ($old->file_path) {
                    Storage::disk('secure')->delete($old->file_path);
                }
                $old->delete();
            }
        }

        return ['regenerated' => $regenerated, 'skipped_signed' => $skipped];
    }

    /**
     * If the Form or FormContract template was edited since $existing was generated,
     * and nobody has signed it yet, regenerate the PDF so the candidate sees the
     * up-to-date document instead of a stale cached one.
     */
    public function regenerateIfStale(Candidate $candidate, FormContract $formContract, GeneratedContract $existing): GeneratedContract
    {
        if ($existing->hasAnySignature() || ! $existing->isStale()) {
            return $existing;
        }

        Log::info("GenContract: Regenerating stale contract for candidate {$candidate->id}, form_contract {$formContract->id} (form/template updated since last generation).");

        $this->generateContract($candidate, $formContract);

        return GeneratedContract::where('candidate_id', $candidate->id)
            ->where('form_contract_id', $formContract->id)
            ->latest('generated_at')
            ->first() ?? $existing;
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

            $fontFamily = in_array($formContract->font_family, FormContract::FONT_FAMILIES, true)
                ? $formContract->font_family
                : FormContract::DEFAULT_FONT_FAMILY;
            $fontSize = $formContract->font_size ?: FormContract::DEFAULT_FONT_SIZE;

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
                            // (x, y) from the layout editor = left edge / vertical middle of the text.
                            $text = (string) $value;
                            $lineHeight = 6;
                            $pdf->SetFont($fontFamily, 'B', $fontSize);
                            $pdf->SetTextColor(0, 0, 0);
                            $pdf->setCellPaddings(0, 0, 0, 0);
                            $pdf->SetXY($x, $y - ($lineHeight / 2));
                            $pdf->Cell($pdf->GetStringWidth($text) + 1, $lineHeight, $text, 0, 0, 'L', false, '', 0, false, 'T', 'M');
                        }
                    }
                }
            }

            // Append conditional annexes from the document library, based on the
            // candidate's form data, after the main template's own pages.
            foreach ($this->resolveAnnexDocuments($candidate, $formContract) as $annexDocument) {
                $this->appendAnnexPages($pdf, $annexDocument);
            }

            return $pdf->Output('', 'S');
        } catch (\Exception $e) {
            Log::error('CRITICAL: Contract generation failed: '.$e->getMessage()."\n".$e->getTraceAsString());
            throw $e;
        }
    }

    /**
     * Append every page of a library document to the end of the PDF being built,
     * as plain pages (no overlay).
     */
    protected function appendAnnexPages(TcpdfFpdi $pdf, LibraryDocument $document): void
    {
        if (! Storage::disk('secure')->exists($document->file_path)) {
            Log::error("GenContract: Annex document {$document->id} file missing at {$document->file_path}");

            return;
        }

        try {
            $annexPath = Storage::disk('secure')->path($document->file_path);
            $pageCount = $pdf->setSourceFile($annexPath);

            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $pdf->importPage($pageNo);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height'], true);

            }
        } catch (\Exception $e) {
            Log::error("GenContract: Failed to append annex document {$document->id}: ".$e->getMessage());
        }
    }

    /**
     * Determine which library documents should be merged onto this contract,
     * based on the candidate's submitted form data and the contract's annex rules.
     *
     * Rule shape: { field_name, operator: 'equals'|'not_equals'|'contains'|'in', value, document_ids: [] }
     *
     * @return \Illuminate\Support\Collection<int, LibraryDocument>
     */
    public function resolveAnnexDocuments(Candidate $candidate, FormContract $formContract)
    {
        $rules = $formContract->annex_rules ?? [];
        if (empty($rules)) {
            return collect();
        }

        $documentIds = [];
        foreach ($rules as $rule) {
            $fieldName = $rule['field_name'] ?? null;
            $operator = $rule['operator'] ?? 'equals';
            $expected = $rule['value'] ?? null;
            $ruleDocumentIds = $rule['document_ids'] ?? [];

            if (! $fieldName || empty($ruleDocumentIds)) {
                continue;
            }

            $actual = $candidate->data[$fieldName] ?? null;

            if ($this->ruleMatches($operator, $actual, $expected)) {
                array_push($documentIds, ...$ruleDocumentIds);
            }
        }

        if (empty($documentIds)) {
            return collect();
        }

        $documentIds = array_values(array_unique($documentIds));
        $documents = LibraryDocument::whereIn('id', $documentIds)->get()->keyBy('id');

        // Preserve the order documents were matched in.
        return collect($documentIds)->map(fn ($id) => $documents->get($id))->filter()->values();
    }

    protected function ruleMatches(string $operator, mixed $actual, mixed $expected): bool
    {
        // A field like a multi-select checkbox group stores an array of selected
        // values - match against each one individually rather than collapsing
        // the array to an empty string, otherwise rules never match.
        $actualValues = is_array($actual)
            ? array_map(fn ($v) => trim((string) $v), $actual)
            : [trim((string) $actual)];

        $expectedStr = is_array($expected) ? '' : trim((string) $expected);
        $expectedList = array_map('strtolower', array_map('trim', is_array($expected) ? $expected : explode(',', (string) $expected)));

        return match ($operator) {
            'not_equals' => ! collect($actualValues)->contains(fn ($v) => strcasecmp($v, $expectedStr) === 0),
            'contains' => collect($actualValues)->contains(fn ($v) => $v !== '' && stripos($v, $expectedStr) !== false),
            'in' => collect($actualValues)->contains(fn ($v) => in_array(strtolower($v), $expectedList, true)),
            default => collect($actualValues)->contains(fn ($v) => strcasecmp($v, $expectedStr) === 0), // 'equals'
        };
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
                'placeholders' => array_merge(
                    $contract->placeholders ?? [],
                    $this->annexSignaturePlaceholders($candidate, $contract),
                ),
            ];
        }

        return $result;
    }

    /**
     * Signature / initials boxes and text fields placed on the library documents appended to this
     * contract, expressed as layout placeholders whose page numbers account for
     * the template's own pages and any annex appended before them.
     */
    public function annexSignaturePlaceholders(Candidate $candidate, FormContract $formContract): array
    {
        $annexes = $this->resolveAnnexDocuments($candidate, $formContract);
        if ($annexes->isEmpty()) {
            return [];
        }

        $offset = $this->countPdfPages($formContract->template_path);
        if ($offset === null) {
            return [];
        }

        $placeholders = [];
        foreach ($annexes as $annex) {
            foreach ($annex->elements ?? [] as $element) {
                $type = $element['type'] ?? null;
                if (in_array($type, ['signature', 'initials', 'admin_signature', 'text'], true)) {
                    // 'text' = free-text field the candidate fills in while signing (its text is the label)
                    $isText = $type === 'text';
                    $placeholders[] = [
                        'placeholder' => "{$type}_annex_{$annex->id}_".($element['id'] ?? uniqid()),
                        'source' => 'system',
                        'field_name' => $isText ? 'text_input' : $type,
                        'field_type' => $isText ? 'text' : 'image',
                        'label' => $isText ? ($element['text'] ?? null) : null,
                        'position' => [
                            'x' => (float) $element['x'],
                            'y' => (float) $element['y'],
                            'width' => (float) ($element['width'] ?? ($isText ? 30 : 20)),
                            'height' => (float) ($element['height'] ?? ($isText ? 4 : 10)),
                            'page' => $offset + (int) $element['page'],
                        ],
                    ];
                }
            }

            $annexPages = $this->countPdfPages($annex->file_path);
            if ($annexPages === null) {
                break; // Can't know where later annexes start - don't misplace their boxes.
            }
            $offset += $annexPages;
        }

        return $placeholders;
    }

    protected function countPdfPages(?string $securePath): ?int
    {
        if (! $securePath || ! Storage::disk('secure')->exists($securePath)) {
            return null;
        }

        try {
            return (new TcpdfFpdi)->setSourceFile(Storage::disk('secure')->path($securePath));
        } catch (\Exception $e) {
            Log::error("GenContract: Could not count pages of {$securePath}: ".$e->getMessage());

            return null;
        }
    }

    /**
     * Look up a submitted form field value (falls back to case-insensitive keys and
     * to a direct candidate attribute such as name/email).
     */
    protected function resolveFormFieldValue(Candidate $candidate, string $fieldName, string $cleanKey, string $searchKey): mixed
    {
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

        if ($value instanceof \Carbon\Carbon || $value instanceof \DateTimeInterface) {
            $value = $value->format('d-m-Y');
        }

        // If it's a file object from dynamic form, we want the path for images
        if (is_array($value) && isset($value['path'])) {
            $value = $value['path'];
        } elseif (is_array($value) && isset($value['name']) && ! isset($value['path'])) {
            $value = $value['name'];
        }

        return $value;
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
                    $value = $this->resolveFormFieldValue($candidate, $fieldName, $cleanKey, $searchKey);
                    break;
                case 'concat':
                    // Several form fields joined with a separator (e.g. first name + last name).
                    $separator = (string) ($mapping['separator'] ?? ' ');
                    $parts = [];
                    foreach ((array) ($mapping['field_names'] ?? []) as $partName) {
                        $part = $this->resolveFormFieldValue($candidate, (string) $partName, (string) $partName, (string) $partName);
                        if (is_array($part)) {
                            $part = implode(', ', array_map('strval', $part));
                        }
                        $part = trim((string) $part);
                        if ($part !== '') {
                            $parts[] = $part;
                        }
                    }
                    $value = implode($separator, $parts);
                    break;
                case 'candidate_data':
                    $value = $candidate->{$fieldName} ?? $candidate->{$searchKey} ?? '';
                    if ($value instanceof \Carbon\Carbon || $value instanceof \DateTimeInterface) {
                        $value = $value->format('d-m-Y');
                    }
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
                        $value = date('d-m-Y');
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
