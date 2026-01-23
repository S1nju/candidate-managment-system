<?php
namespace App\Modules\Candidates\Http\Controllers;

use App\Modules\Candidates\Models\Candidate;
use App\Services\ContractGeneratorService;
use App\Modules\Candidates\Services\CandidateSigningService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

use App\Modules\Audit\Services\AuditService;

class ContractController extends Controller
{
    public function __construct(
        protected ContractGeneratorService $generatorService,
        protected CandidateSigningService $signingService,
        protected AuditService $auditService
    ) {}

    public function generate(Candidate $candidate): JsonResponse
    {
        // Check if signed contract exists
        if ($candidate->contract_status === 'signed' && $candidate->contract_path) {
            $signedPath = storage_path('app/secure/contracts/signed/' . basename($candidate->contract_path));
            if (file_exists($signedPath)) {
                return response()->json(['file' => 'contracts/signed/' . basename($candidate->contract_path)]);
            }
        }

        // Check if unsigned contract already exists
        if ($candidate->contract_path) {
            $existingPath = storage_path('app/secure/' . $candidate->contract_path);
            if (file_exists($existingPath)) {
                return response()->json(['file' => $candidate->contract_path]);
            }
        }

        // Generate new contract
        $filename = $this->generatorService->generate($candidate);
        
        // Save the path to database
        $candidate->update(['contract_path' => $filename]);
        
        return response()->json(['file' => $filename]);
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

        $signature = $this->signingService->signContract($candidate, $request->user(), $data);

        return response()->json($signature);
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

    public function download($filename)
    {
        // Aggressively clean the filename input from any hidden characters
        $filename = str_replace(["\r", "\n", "\t", "\0", "\x0B"], '', trim($filename));
        $filename = str_replace('contracts/', '', $filename);
        
        // Build the full path
        $path = storage_path('app/secure/contracts/' . $filename);
        
        if (!file_exists($path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        // Generate a safe display name for the download
        $displayName = basename($filename);
        $displayName = str_replace(["\r", "\n", "\t", "\0", "\x0B"], '', $displayName);
        $displayName = preg_replace('/[^A-Za-z0-9\._-]/', '_', $displayName);

        // Clear any output buffer that might have stray newlines
        if (ob_get_length()) ob_end_clean();

        // use download() which handles headers more safely
        return response()->download($path, $displayName, [
            'Content-Type' => 'application/pdf',
        ]);
    }
}
