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
        // If already signed, return the signed contract
        if (($candidate->contract_status === 'signed' || $candidate->contract_path) && $candidate->contract_path) {
            return response()->json([
                'file' => $candidate->contract_path,
                'is_signed' => true,
            ]);
        }

        $candidate->load('form.contracts');

        if (! $candidate->form || $candidate->form->contracts->isEmpty()) {
            return response()->json(['message' => 'No contracts available for this candidate'], 404);
        }

        $previewData = $this->generatorService->getCandidateDataWithPlaceholders($candidate);

        if (empty($previewData)) {
            return response()->json(['message' => 'Failed to resolve contract data'], 404);
        }

        // For now, support one contract per candidate in the signing UI
        $first = $previewData[0];

        // If we strictly want to avoid generating a PDF on disk for preview,
        // we should just return the template path and the data to be overlaid by frontend or ignored until signing.
        // The current 'first' contains 'template_path'.

        return response()->json([
            'file' => $first['template_path'], // Return template directly
            'preview_data' => $first['data'],
            'placeholders' => $first['placeholders'],
            'is_signed' => false,
        ]);
    }

    public function sign(Request $request, Candidate $candidate): JsonResponse
    {
        $data = $request->validate([
            'signatures' => 'required|array',
            'signatures.*.type' => 'required|string',
            'signatures.*.value' => 'required|string',
            'signatures.*.placement' => 'required|array',
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

    public function preview(Candidate $candidate): \Illuminate\Http\Response
    {
        // If already signed, return the signed file
        if ($candidate->contract_status === 'signed' && $candidate->contract_path && Storage::disk('secure')->exists($candidate->contract_path)) {
            $fileContent = Storage::disk('secure')->get($candidate->contract_path);

            return response($fileContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="contract_signed.pdf"');
        }

        $candidate->load('form.contracts');
        
        if (!$candidate->form) {
            \Illuminate\Support\Facades\Log::error("Preview failed: Candidate {$candidate->id} has no assigned form.");
            abort(404, 'Form not assigned to candidate');
        }

        $contract = $candidate->form->contracts->first();

        if (! $contract) {
            \Illuminate\Support\Facades\Log::error("Preview failed: Form {$candidate->form_id} has no contracts.");
            abort(404, 'No contract found for this form');
        }

        \Illuminate\Support\Facades\Log::info("Generating preview for candidate {$candidate->id} using contract {$contract->id}");
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
}
