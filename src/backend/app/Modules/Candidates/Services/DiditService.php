<?php

namespace App\Modules\Candidates\Services;

use App\Modules\Candidates\Models\CandidateVerification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DiditService
{
    /**
     * Create a new verification session with Didit.
     */
    public function createSession(array $candidateData): array
    {
        $apiKey = config('services.didit.api_key');
        $workflowId = config('services.didit.workflow_id');

        if (!$apiKey || !$workflowId) {
            throw new \Exception('Didit configuration is missing.');
        }

        $email = $candidateData['email'];
        $name = $candidateData['name'] ?? 'Candidate';
        $dob = $candidateData['dob'] ?? null;

        $payload = [
            'workflow_id' => $workflowId,
            'vendor_data' => $email,
            'callback' => url('/api/candidates/verify-callback'),
            'contact_details' => [
                'email' => $email,
            ],
        ];

        if ($dob) {
            $payload['expected_details'] = [
                'first_name' => explode(' ', $name)[0],
                'date_of_birth' => $dob,
            ];
        }

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://verification.didit.me/v3/session/', $payload);

        if ($response->failed()) {
            Log::error('Didit session creation failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            throw new \Exception('Failed to initiate verification session with Didit: ' . $response->body());
        }

        $sessionData = $response->json();

        // Save verification record
        CandidateVerification::updateOrCreate(
            ['session_id' => $sessionData['session_id']],
            [
                'form_data' => $candidateData,
                'status' => 'pending',
                'verification_url' => $sessionData['url'],
            ]
        );

        return $sessionData;
    }
}
