<?php

namespace App\Modules\Signing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Documents\Models\Document;
use App\Modules\Signing\Http\Requests\SignDocumentRequest;
use App\Modules\Signing\Services\SigningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class SigningController extends Controller
{
    public function __construct(protected SigningService $signingService) {}

    public function sign(SignDocumentRequest $request, Document $document): JsonResponse
    {
        try {
            $data = $request->validated();
            $data['ip_address'] = $request->ip();
            $data['user_agent'] = $request->userAgent();
            // Pass all signatures overlays
            $signature = $this->signingService->signDocument($document, $request->user(), $data);

            return response()->json([
                'message' => 'Document signed successfully',
                'signature' => $signature,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function reject(Request $request, Document $document): JsonResponse
    {
        $request->validate(['reason' => 'required|string']);

        try {
            $this->signingService->rejectDocument($document, $request->user(), $request->input('reason'));

            return response()->json(['message' => 'Document rejected']);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
