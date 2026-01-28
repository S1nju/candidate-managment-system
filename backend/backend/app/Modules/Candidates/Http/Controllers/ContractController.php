<?php
namespace App\Modules\Candidates\Http\Controllers;

use App\Modules\Candidates\Models\Candidate;
use App\Modules\Candidates\Services\CandidateSigningService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use App\Modules\Audit\Services\AuditService;

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
                'is_signed' => true
            ]);
        }
        
        $candidate->load('form.contracts');
        
        if (!$candidate->form || $candidate->form->contracts->isEmpty()) {
            return response()->json(['message' => 'No contracts available for this candidate'], 404);
        }

        $previewData = $this->generatorService->getCandidateDataWithPlaceholders($candidate);
        
        if (empty($previewData)) {
            return response()->json(['message' => 'Failed to resolve contract data'], 404);
        }

        // For now, support one contract per candidate in the signing UI
        $first = $previewData[0];

        return response()->json([
            'file' => $first['template_path'],
            'preview_data' => $first['data'],
            'placeholders' => $first['placeholders'],
            'is_signed' => false
        ]);
    }

    public function sign(Request $request, Candidate $candidate): JsonResponse
    {
        $data = $request->validate([
            'signatures' => 'required|array',
            'signatures.*.type' => 'required|string',
            'signatures.*.value' => 'required|string',
            'signatures.*.placement' => 'required|array',
            'ip_address' => 'nullable|string',
            'user_agent' => 'nullable|string',
        ]);

        $this->signingService->signContract($candidate, $request->user(), $data);

        return response()->json(['message' => 'Contract signed successfully']);
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
        
        \Illuminate\Support\Facades\Log::info("Contract download request for path: " . $path);

        if (!Storage::disk('secure')->exists($path)) {
            \Illuminate\Support\Facades\Log::error("File not found on secure disk: " . $path);
            abort(404, 'File not found: ' . $path);
        }

        return Storage::disk('secure')->download($path, basename($path));
    }
}
