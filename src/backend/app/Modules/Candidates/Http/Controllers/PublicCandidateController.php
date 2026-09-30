<?php

namespace App\Modules\Candidates\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Candidates\Services\CandidateSigningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PublicCandidateController extends Controller
{
    public function __construct(
        protected \App\Modules\Forms\Services\ContractGenerationService $generatorService,
        protected CandidateSigningService $signingService
    ) {}

    public function show(string $token): JsonResponse
    {
        $candidate = Candidate::where('signing_token', $token)->firstOrFail();

        // Allowing view if signed might be okay, but for now let's focus on signing flow.
        // If signed, maybe return status so frontend can show "Thank you".

        $candidate->load('form.contracts');

        if (! $candidate->form || $candidate->form->contracts->isEmpty()) {
            return response()->json(['message' => 'No contracts available.'], 404);
        }

        $previewData = $this->generatorService->getCandidateDataWithPlaceholders($candidate);

        if (empty($previewData)) {
            return response()->json(['message' => 'Failed to resolve contract data'], 404);
        }

        $contracts = [];
        foreach ($previewData as $item) {
            $generated = \App\Modules\Forms\Models\GeneratedContract::where('candidate_id', $candidate->id)
                ->where('form_contract_id', $item['contract_id'])
                ->latest('generated_at')
                ->first();

            // Check if candidate signed this specific contract
            $isCandidateSigned = $generated && ($generated->signature_metadata['candidate_signed'] ?? false);

            $contracts[] = [
                'id' => $item['contract_id'],
                'name' => $candidate->form->contracts->where('id', $item['contract_id'])->first()->name,
                'template_path' => $item['template_path'],
                'preview_data' => $item['data'],
                'placeholders' => $item['placeholders'],
                'status' => $generated ? $generated->status : 'pending',
                'candidate_signed' => $isCandidateSigned,
            ];
        }

        $active = collect($contracts)->firstWhere('candidate_signed', false) ?? $contracts[0];

        return response()->json([
            'candidate_name' => $candidate->display_name,
            'contract_status' => $candidate->contract_status,
            'contracts' => $contracts,
            // Convenience
            'active_contract_id' => $active['id'],
            'is_fully_signed' => $candidate->contract_status === 'signed' || $candidate->contract_status === 'pending_admin_signature',
        ]);
    }

    public function preview(Request $request, string $token)
    {
        $candidate = Candidate::where('signing_token', $token)->firstOrFail();

        $contractId = $request->input('contract_id');

        // Load contract definition
        $contract = $candidate->form->contracts->where('id', $contractId)->first();
        if (! $contract) {
            $contract = $candidate->form->contracts->first();
        }

        if (! $contract) {
            abort(404);
        }

        // Check if we have a generated file
        $generated = \App\Modules\Forms\Models\GeneratedContract::where('candidate_id', $candidate->id)
            ->where('form_contract_id', $contract->id)
            ->latest('generated_at')
            ->first();

        if ($generated) {
            $generated = $this->generatorService->regenerateIfStale($candidate, $contract, $generated);
        }

        // If candidate already signed, show the signed version (so they can see their signature)
        // But if Admin hasn't signed, it might be in 'file_path' or 'signed_path' depending on logic.
        // In logic: signContract updates 'signed_path'. Awaiting Admin signature means 'signed_path' has candidate sig.

        if ($generated && $generated->signed_path && Storage::disk('secure')->exists($generated->signed_path)) {
            $path = $generated->signed_path;
        } elseif ($generated && Storage::disk('secure')->exists($generated->file_path)) {
            $path = $generated->file_path;
        } else {
            $content = $this->generatorService->generateContent($candidate, $contract);

            return response($content)->header('Content-Type', 'application/pdf');
        }

        return Storage::disk('secure')->download($path, 'contract.pdf', ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline']);
    }

    public function sign(Request $request, string $token): JsonResponse
    {
        $candidate = Candidate::where('signing_token', $token)->firstOrFail();

        if ($candidate->contract_status === 'signed' || $candidate->contract_status === 'rejected') {
            return response()->json(['message' => 'This contract cannot be signed anymore.'], 403);
        }

        $data = $request->validate([
            'signatures' => 'required|array',
            'signatures.*.type' => 'required|string',
            'signatures.*.value' => 'required|string',
            'signatures.*.placement' => 'required|array',
            'form_contract_id' => 'required|integer|exists:form_contracts,id',
            'ip_address' => 'nullable|string',
            'user_agent' => 'nullable|string',
        ]);

        try {
            // Pass NULL as user to indicate candidate signing
            $this->signingService->signContract($candidate, null, $data);

            return response()->json(['message' => 'Contract signed successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
