<?php

namespace App\Modules\Candidates\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Candidates\Http\Requests\LockContractRequest;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Candidates\Services\CandidateSigningService;
use Illuminate\Http\JsonResponse;

class ContractLockController extends Controller
{
    public function __construct(protected CandidateSigningService $signingService) {}

    public function checkStatus(Candidate $candidate): JsonResponse
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
                return response()->json(['status' => 'available']);
            }

            $lockedBy = User::find($candidate->signing_in_progress_by);
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

    public function acquire(LockContractRequest $request, Candidate $candidate): JsonResponse
    {
        try {
            $sessionId = $request->validated('session_id');
            $this->signingService->acquireSoftLock($candidate, $request->user(), $sessionId);

            return response()->json(['message' => 'Lock acquired successfully']);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to acquire lock'], 500);
        }
    }

    public function release(LockContractRequest $request, Candidate $candidate): JsonResponse
    {
        try {
            $sessionId = $request->validated('session_id');
            $this->signingService->releaseSoftLock($candidate, $sessionId);

            return response()->json(['message' => 'Lock released successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to release lock'], 500);
        }
    }

    public function ping(LockContractRequest $request, Candidate $candidate): JsonResponse
    {
        try {
            $sessionId = $request->validated('session_id');
            $this->signingService->pingSoftLock($candidate, $request->user(), $sessionId);

            return response()->json(['status' => 'ok']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Ping failed'], 500);
        }
    }
}
