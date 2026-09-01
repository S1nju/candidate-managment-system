<?php

namespace App\Modules\Candidates\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Services\AuditService;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Candidates\Services\CandidateSigningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContractController extends Controller
{
    public function __construct(
        protected \App\Modules\Forms\Services\ContractGenerationService $generatorService,
        protected CandidateSigningService $signingService,
        protected AuditService $auditService
    ) {}

    public function generate(Candidate $candidate): JsonResponse
    {
        // If candidate is fully signed (legacy check or global status), we might want to return that?
        // But for multi-contract, we always want the list.

        // Check if rejected
        if ($candidate->contract_status === 'rejected') {
            abort(403, 'This contract has been rejected.');
        }

        $candidate->load('form.contracts');

        if (! $candidate->form || $candidate->form->contracts->isEmpty()) {
            return response()->json(['message' => 'No contracts available for this candidate'], 404);
        }

        // Ensure we create pending records for all contracts if they don't exist?
        // The generator service does generation on demand usually, but let's see.
        // getCandidateDataWithPlaceholders just resolves data, doesn't generate PDF.

        $previewData = $this->generatorService->getCandidateDataWithPlaceholders($candidate);

        if (empty($previewData)) {
            return response()->json(['message' => 'Failed to resolve contract data'], 404);
        }

        // Enrich with status
        $contracts = [];
        foreach ($previewData as $item) {
            // Find latest generated record
            $generated = \App\Modules\Forms\Models\GeneratedContract::where('candidate_id', $candidate->id)
                ->where('form_contract_id', $item['contract_id'])
                ->latest('generated_at')
                ->first();

            $contracts[] = [
                'id' => $item['contract_id'],
                'name' => $candidate->form->contracts->where('id', $item['contract_id'])->first()->name, // Get name
                'template_path' => $item['template_path'],
                'preview_data' => $item['data'],
                'placeholders' => $item['placeholders'],
                'status' => $generated ? $generated->status : 'pending',
                'signed_at' => $generated ? $generated->signed_at : null,
                'is_signed' => $generated && $generated->status === 'signed',
            ];
        }

        // Determine "current" or "active" contract (first pending, or first if all signed)
        $active = collect($contracts)->firstWhere('status', 'pending') ?? $contracts[0];

        \Illuminate\Support\Facades\Log::info('Contract generation debug:', [
            'candidate_id' => $candidate->id,
            'contracts_count' => count($contracts),
            'active_contract_placeholders' => $active['placeholders'] ?? 'none',
        ]);

        return response()->json([
            'contracts' => $contracts,
            // Legacy/Convenience fields for default view
            'file' => $active['template_path'],
            'preview_data' => $active['preview_data'],
            'placeholders' => $active['placeholders'],
            'is_signed' => $active['is_signed'],
            'active_contract_id' => $active['id'],
        ]);
    }

    public function sign(SignContractRequest $request, Candidate $candidate): JsonResponse
    {
        if ($candidate->contract_status === 'rejected') {
            abort(403, 'This contract has been rejected and cannot be signed.');
        }

        try {
            $this->signingService->signContract($candidate, $request->user(), $request->validated());

            return response()->json(['message' => 'Contract signed successfully']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Contract signing failed: '.$e->getMessage());

            return response()->json(['message' => 'Failed to sign contract'], 500);
        }
    }

    public function reject(RejectContractRequest $request, Candidate $candidate): JsonResponse
    {
        $validated = $request->validated();
        $reason = $validated['reason'] ?? null;

        $candidate->update([
            'contract_status' => 'rejected',
            'data' => array_merge($candidate->data ?? [], [
                'rejection_reason' => $reason,
                'rejected_at' => now()->toDateTimeString(),
                'rejected_by' => $request->user()->id,
            ]),
        ]);

        $this->auditService->log('contract_rejected', $candidate, ['reason' => $reason]);

        return response()->json(['message' => 'Contract rejected successfully', 'candidate' => $candidate]);
    }

    public function download($id)
    {
        if (is_numeric($id)) {
            $generated = \App\Modules\Forms\Models\GeneratedContract::findOrFail($id);
            $path = $generated->signed_path ?: $generated->file_path;
        } else {
            $path = ltrim(rawurldecode($id), '/');
        }

        if (! Storage::disk('secure')->exists($path)) {
            abort(404, 'File not found: '.$path);
        }

        return Storage::disk('secure')->download($path, basename($path));
    }

    public function preview(Request $request, Candidate $candidate): \Illuminate\Http\Response
    {
        if ($candidate->contract_status === 'rejected') {
            abort(403, 'This contract has been rejected and cannot be viewed.');
        }

        $contractId = $request->input('contract_id');

        if ($contractId) {
            $generated = \App\Modules\Forms\Models\GeneratedContract::where('candidate_id', $candidate->id)
                ->where('form_contract_id', $contractId)
                ->latest('generated_at')
                ->first();

            if ($generated && $generated->status === 'signed') {
                if ($generated->signed_path && Storage::disk('secure')->exists($generated->signed_path)) {
                    $fileContent = Storage::disk('secure')->get($generated->signed_path);

                    return response($fileContent)
                        ->header('Content-Type', 'application/pdf')
                        ->header('Content-Disposition', 'inline; filename="contract_signed.pdf"');
                } else {
                    abort(403, 'Contract is signed but file is missing.');
                }
            }
        } elseif ($candidate->contract_status === 'signed') {
            if ($candidate->contract_path && Storage::disk('secure')->exists($candidate->contract_path)) {
                $fileContent = Storage::disk('secure')->get($candidate->contract_path);

                return response($fileContent)
                    ->header('Content-Type', 'application/pdf')
                    ->header('Content-Disposition', 'inline; filename="contract_signed.pdf"');
            }
            abort(403, 'Contract is already signed.');
        }

        $candidate->load('form.contracts');
        $contract = $contractId
            ? $candidate->form->contracts->where('id', $contractId)->first()
            : $candidate->form->contracts->first();

        if (! $contract) {
            abort(404, 'No contract found');
        }

        $generated = \App\Modules\Forms\Models\GeneratedContract::where('candidate_id', $candidate->id)
            ->where('form_contract_id', $contract->id)
            ->latest('generated_at')
            ->first();

        if ($generated && $generated->signed_path && Storage::disk('secure')->exists($generated->signed_path)) {
            $isCandidateSigned = $generated->signature_metadata['candidate_signed'] ?? false;

            if ($isCandidateSigned) {
                $fileContent = Storage::disk('secure')->get($generated->signed_path);

                return response($fileContent)
                    ->header('Content-Type', 'application/pdf')
                    ->header('Content-Disposition', 'inline; filename="contract_preview.pdf"');
            }
        }

        $pdfContent = $this->generatorService->generateContent($candidate, $contract);

        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="contract_preview.pdf"');
    }


    public function sendSignatureRequest(Candidate $candidate): JsonResponse
    {
        // 1. Validation
        if (! $candidate->email) {
            return response()->json(['message' => 'Candidate has no email address.'], 400);
        }

        if ($candidate->contract_status === 'rejected') {
            return response()->json(['message' => 'Contract is rejected.'], 400);
        }

        if ($candidate->contract_status === 'signed') {
            return response()->json(['message' => 'Contract is already signed.'], 400);
        }

        // 2. Generate Token if not exists
        if (! $candidate->signing_token) {
            $candidate->signing_token = \Illuminate\Support\Str::random(64);
        }

        // 3. Update Status and Timestamp
        $candidate->sent_for_signature_at = now();
        // Only update status if it's strictly "pending" (initial).
        // If it's already "pending_candidate_signature", we just resend.
        if ($candidate->contract_status === 'pending') {
            $candidate->contract_status = 'pending_candidate_signature';
        }

        $candidate->save();

        // 4. Send Email
        // Build URL: /candidate/sign/{token}
        // Use FRONTEND_URL from .env, fallback to app.url if not set
        $frontendUrl = config('app.frontend_url', config('app.url'));
        $url = rtrim($frontendUrl, '/').'/candidate/sign/'.$candidate->signing_token;

        \Illuminate\Support\Facades\Mail::to($candidate->email)
            ->send(new \App\Mail\CandidateSignatureRequest($candidate, $url));

        $this->auditService->log('signature_request_sent', $candidate, [
            'email' => $candidate->email,
        ]);

        return response()->json([
            'message' => 'Signature request sent successfully.',
            'candidate' => $candidate->refresh(),
        ]);
    }
}
