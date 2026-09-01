<?php

namespace App\Modules\Signing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Forms\Models\GeneratedContract;
use App\Services\SignatureSecurityService;
use Illuminate\Http\JsonResponse;

class SignatureVerificationController extends Controller
{
    public function __construct(protected SignatureSecurityService $securityService) {}

    public function verify(string $hash): JsonResponse
    {
        $contract = GeneratedContract::where('signature_hash', $hash)
            ->orWhere('signature_metadata->signature_hash', $hash)
            ->first();

        if (!$contract) {
            return response()->json([
                'is_valid' => false,
                'status' => 'NOT_FOUND',
                'message' => 'No signature record found matching this cryptographic hash.',
            ], 404);
        }

        $verificationResult = $this->securityService->verifyGeneratedContract($contract);

        return response()->json($verificationResult);
    }
}
