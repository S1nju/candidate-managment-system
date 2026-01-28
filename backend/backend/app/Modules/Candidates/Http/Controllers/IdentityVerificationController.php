<?php
 
namespace App\Modules\Candidates\Http\Controllers;
 
use App\Http\Controllers\Controller;
use App\Modules\Candidates\Models\CandidateVerification;
use App\Modules\Candidates\Models\Candidate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
 
class IdentityVerificationController extends Controller
{
    /**
     * Initiate the identity verification process.
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'gender' => 'required|string',
            'name' => 'required|string|max:255',
            'nationality' => 'required|string',
            'dob' => 'required|date',
            'address' => 'required|string',
            'social_security_number' => 'required|string|size:15',
            'phone' => 'required|string',
            'emergency_phone' => 'required|string',
            'recruitment_city' => 'required|string',
            'animator_name' => 'required|string',
            'product_justcost' => 'required|string',
            'contract_type' => 'required|string',
            'start_date' => 'required|date',
            'photo' => 'nullable|image|max:2048',
            'cv' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('candidates/photos', 'public');
            $validated['photo_url'] = '/storage/' . $path;
            unset($validated['photo']);
        }

        if ($request->hasFile('cv')) {
            $path = $request->file('cv')->store('candidates/cvs', 'public');
            $validated['cv_url'] = '/storage/' . $path;
            unset($validated['cv']);
        }
 
        $apiKey = config('services.didit.api_key');
        $workflowId = config('services.didit.workflow_id');
 
        if (!$apiKey || !$workflowId) {
            return response()->json([
                'message' => 'Didit configuration is missing.',
            ], 500);
        }
 
        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->post('https://verification.didit.me/v3/session/', [
                'workflow_id' => $workflowId,
                'vendor_data' => $validated['email'],
                'callback' => url('/api/candidates/verify-callback'),
                'contact_details' => [
                    'email' => $validated['email'],
                ],
                'expected_details' => [
                    'first_name' => explode(' ', $validated['name'])[0],
                    'date_of_birth' => $validated['dob'],
                ]
            ]);
 
            if ($response->failed()) {
                Log::error('Didit session creation failed', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);
                return response()->json([
                    'message' => 'Failed to initiate verification session with Didit.',
                    'error' => $response->json(),
                ], 400);
            }
 
            $sessionData = $response->json();
 
            // Save form data temporarily - using updateOrCreate to handle potential duplicate session IDs
            CandidateVerification::updateOrCreate(
                ['session_id' => $sessionData['session_id']],
                [
                    'form_data' => $validated,
                    'status' => 'pending',
                    'verification_url' => $sessionData['url'],
                ]
            );
 
            return response()->json([
                'url' => $sessionData['url'],
                'session_id' => $sessionData['session_id'],
            ]);
 
        } catch (\Exception $e) {
            Log::error('Identity verification initiation error', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'An unexpected error occurred while initiating verification.',
            ], 500);
        }
    }
 
    /**
     * Callback from Didit after verification.
     */
    public function callback(Request $request): RedirectResponse
    {
        $sessionId = $request->query('verificationSessionId');
        $status = $request->query('status'); // Approved, Declined, In Review
 
        $verification = CandidateVerification::where('session_id', $sessionId)->firstOrFail();
 
        if ($status === 'Approved') {
            // Verify status again with Didit to be sure
            $apiKey = config('services.didit.api_key');
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
            ])->get("https://verification.didit.me/v3/session/{$sessionId}/decision/");
 
            if ($response->successful() && $response->json()['status'] === 'Approved') {
                // Save candidate
                $candidateData = $verification->form_data;
                $candidateData['didit_session_id'] = $sessionId;

                $candidate = Candidate::create($candidateData);
                $verification->update(['status' => 'approved']);

                // Generate contracts automatically
                app(\App\Modules\Forms\Services\ContractGenerationService::class)->generateForCandidate($candidate);

                // Redirect to frontend success page
                return redirect(config('app.frontend_url', 'http://localhost:3000') . '/candidate/apply/success?session_id=' . $sessionId);
            }
        }
 
        $verification->update(['status' => strtolower($status)]);
 
        return redirect(config('app.frontend_url', 'http://localhost:3000') . '/candidate/apply/failed?status=' . $status);
    }
 
    public function getDiditDecision(string $sessionId): JsonResponse
    {
        $apiKey = config('services.didit.api_key');
        
        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'accept' => 'application/json',
        ])->get("https://verification.didit.me/v3/session/{$sessionId}/decision/");

        if ($response->failed()) {
            return response()->json([
                'message' => 'Failed to fetch Didit decision',
                'error' => $response->json()
            ], $response->status());
        }

        return response()->json($response->json());
    }
}
