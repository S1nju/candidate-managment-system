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

    public function sign(Request $request, Candidate $candidate): JsonResponse
    {
        // Check if rejected
        if ($candidate->contract_status === 'rejected') {
            abort(403, 'This contract has been rejected and cannot be signed.');
        }

        $data = $request->validate([
            'signatures' => 'required|array',
            'signatures.*.type' => 'required|string',
            'signatures.*.value' => 'required|string',
            'signatures.*.placement' => 'required|array',
            'form_contract_id' => 'required|integer|exists:form_contracts,id',
            'session_id' => 'nullable|string',
            'ip_address' => 'nullable|string',
            'user_agent' => 'nullable|string',
        ]);

        try {
            $this->signingService->signContract($candidate, $request->user(), $data);

            return response()->json(['message' => 'Contract signed successfully']);
        } catch (\RuntimeException $e) {
            // Concurrency conflict or already signed
            return response()->json([
                'message' => $e->getMessage(),
            ], 409); // HTTP 409 Conflict
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Contract signing failed: '.$e->getMessage());

            return response()->json([
                'message' => 'Failed to sign contract',
            ], 500);
        }
    }

    public function reject(Request $request, Candidate $candidate): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $candidate->update([
            'contract_status' => 'rejected',
            'data' => array_merge($candidate->data ?? [], [
                'rejection_reason' => $data['reason'] ?? null,
                'rejected_at' => now()->toDateTimeString(),
                'rejected_by' => $request->user()->id,
            ]),
        ]);

        $this->auditService->log('contract_rejected', $candidate, [
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['message' => 'Contract rejected successfully', 'candidate' => $candidate]);
    }

    public function download($id)
    {
        // Check if it's an ID (numeric) or a path
        if (is_numeric($id)) {
            $generated = \App\Modules\Forms\Models\GeneratedContract::findOrFail($id);
            $path = $generated->file_path;
        } else {
            // Assume it's a relative path from secure disk
            $path = rawurldecode($id);
            // In case of any weird encoding, ensure it's clean
            $path = ltrim($path, '/');
        }

        \Illuminate\Support\Facades\Log::info('Contract download request for path: '.$path);

        if (! Storage::disk('secure')->exists($path)) {
            \Illuminate\Support\Facades\Log::error('File not found on secure disk: '.$path);
            abort(404, 'File not found: '.$path);
        }

        return Storage::disk('secure')->download($path, basename($path));
    }

    public function preview(Request $request, Candidate $candidate): \Illuminate\Http\Response
    {
        // 1. Check if rejected
        if ($candidate->contract_status === 'rejected') {
            abort(403, 'This contract has been rejected and cannot be viewed.');
        }

        $contractId = $request->input('contract_id');

        // 2. Check if specific contract is signed
        if ($contractId) {
            $generated = \App\Modules\Forms\Models\GeneratedContract::where('candidate_id', $candidate->id)
                ->where('form_contract_id', $contractId)
                ->latest('generated_at')
                ->first();

            if ($generated && $generated->status === 'signed') {
                // User requested "not possible to see ... after signing it".
                // This implies they shouldn't see the INTERACTIVE preview.
                // If they want the signed PDF, they should use the download endpoint or this specific block if intended.
                // However, "not possible to see" suggest strictness.
                // I will return the SIGNED PDF if available (standard behavior), but block RE-SIGNING view.
                // Actually, let's block the *generation* of a new preview if it's signed.

                if ($generated->signed_path && Storage::disk('secure')->exists($generated->signed_path)) {
                    // Return signed PDF directly (read-only view)
                    $fileContent = Storage::disk('secure')->get($generated->signed_path);

                    return response($fileContent)
                        ->header('Content-Type', 'application/pdf')
                        ->header('Content-Disposition', 'inline; filename="contract_signed.pdf"');
                } else {
                    abort(403, 'Contract is signed but file is missing.');
                }
            }
        } elseif ($candidate->contract_status === 'signed') {
            // Accessing global preview but candidate is signed
            if ($candidate->contract_path && Storage::disk('secure')->exists($candidate->contract_path)) {
                $fileContent = Storage::disk('secure')->get($candidate->contract_path);

                return response($fileContent)
                    ->header('Content-Type', 'application/pdf')
                    ->header('Content-Disposition', 'inline; filename="contract_signed.pdf"');
            }
            abort(403, 'Contract is already signed.');
        }

        // If we get here, it's pending or pending_admin_signature.

        $candidate->load('form.contracts');

        if ($contractId) {
            $contract = $candidate->form->contracts->where('id', $contractId)->first();
        } else {
            $contract = $candidate->form->contracts->first();
        }

        if (! $contract) {
            abort(404, 'No contract found');
        }

        // Check if candidate has signed this specific contract
        $generated = \App\Modules\Forms\Models\GeneratedContract::where('candidate_id', $candidate->id)
            ->where('form_contract_id', $contract->id)
            ->latest('generated_at')
            ->first();

        // If candidate has signed (pending_admin_signature), show the signed version with candidate's signature
        if ($generated && $generated->signed_path && Storage::disk('secure')->exists($generated->signed_path)) {
            $isCandidateSigned = $generated->signature_metadata['candidate_signed'] ?? false;

            if ($isCandidateSigned) {
                // Return the PDF with candidate's signature so admin can sign on top
                $fileContent = Storage::disk('secure')->get($generated->signed_path);

                return response($fileContent)
                    ->header('Content-Type', 'application/pdf')
                    ->header('Content-Disposition', 'inline; filename="contract_preview.pdf"');
            }
        }

        // Otherwise, generate fresh preview
        $pdfContent = $this->generatorService->generateContent($candidate, $contract);

        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="contract_preview.pdf"');
    }

    public function checkSigningStatus(Candidate $candidate): JsonResponse
    {
        $heartbeatTimeout = 60; // 60 seconds without signal = unlock

        if ($candidate->contract_status === 'signed') {
            return response()->json([
                'status' => 'signed',
                'signed_by' => $candidate->signedBy?->name,
                'signed_at' => $candidate->contract_signed_at,
            ]);
        }

        if ($candidate->signing_in_progress_by) {
            $lastActivity = $candidate->last_ping_at ?: $candidate->signing_started_at;
            $idleSeconds = $lastActivity ? now()->diffInSeconds($lastActivity) : 9999;

            if ($idleSeconds > $heartbeatTimeout) {
                // Expired lock
                return response()->json(['status' => 'available']);
            }

            $lockedBy = \App\Models\User::find($candidate->signing_in_progress_by);
            $remainingTime = $heartbeatTimeout - $idleSeconds;

            return response()->json([
                'status' => 'locked',
                'locked_by' => $lockedBy?->name,
                'locked_at' => $candidate->signing_started_at,
                'last_ping_at' => $candidate->last_ping_at,
                'expires_in_seconds' => max(0, $remainingTime),
            ]);
        }

        return response()->json(['status' => 'available']);
    }

    public function acquireLock(Request $request, Candidate $candidate): JsonResponse
    {
        try {
            $sessionId = $request->input('session_id');
            $this->signingService->acquireSoftLock($candidate, $request->user(), $sessionId);

            return response()->json(['message' => 'Lock acquired successfully']);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 409); // Conflict
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to acquire lock',
            ], 500);
        }
    }

    public function releaseLock(Request $request, Candidate $candidate): JsonResponse
    {
        try {
            $sessionId = $request->input('session_id');
            // Check session ID to prevent older release-lock requests from clearing newer locks
            $this->signingService->releaseSoftLock($candidate, $sessionId);

            return response()->json(['message' => 'Lock released successfully']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to release lock',
            ], 500);
        }
    }

    public function ping(Request $request, Candidate $candidate): JsonResponse
    {
        try {
            $sessionId = $request->input('session_id');
            $this->signingService->pingSoftLock($candidate, $request->user(), $sessionId);

            return response()->json(['status' => 'ok']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Ping failed'], 500);
        }
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
