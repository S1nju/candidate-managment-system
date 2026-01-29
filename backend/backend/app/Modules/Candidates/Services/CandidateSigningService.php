<?php

namespace App\Modules\Candidates\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditService;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\GeneratedContract;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use setasign\Fpdi\TcpdfFpdi;

class CandidateSigningService
{
    public function __construct(
        protected AuditService $auditService,
        protected \App\Modules\Forms\Services\ContractGenerationService $contractGenService
    ) {}

    public function signContract(Candidate $candidate, User $user, array $data): bool
    {
        return DB::transaction(function () use ($candidate, $user, $data) {
            $overlays = $data['signatures'] ?? [];

            // STEP 1: Pessimistic Lock - Lock the row for update
            $lockedCandidate = Candidate::where('id', $candidate->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedCandidate) {
                throw new \Exception('Candidate not found');
            }

            // STEP 2: Check if already signed
            if ($lockedCandidate->contract_status === 'signed') {
                throw new \RuntimeException(
                    "Contract already signed by {$lockedCandidate->signedBy->name} at {$lockedCandidate->contract_signed_at}"
                );
            }

            // STEP 3: Check and acquire soft lock
            $this->acquireSoftLock($lockedCandidate, $user, $data['session_id'] ?? null);

            // STEP 4: Optimistic Lock Check
            $currentVersion = $lockedCandidate->version;

            try {
                $lockedCandidate->load('generatedContracts');
                $latest = $lockedCandidate->generatedContracts->sortByDesc('generated_at')->first();

                if ($latest) {
                    // Use generated contract if available
                    $sourcePath = storage_path('app/secure/'.$latest->file_path);
                    if (! file_exists($sourcePath)) {
                        Log::warning("Generated contract record found but file missing: {$sourcePath}. Regenerating.");
                    } else {
                        $filename = basename($latest->file_path);
                        $basePdfReady = true;
                    }
                }

                if (! isset($basePdfReady)) {
                    // Fallback: Generate the contract NOW
                    $lockedCandidate->load('form.contracts');
                    $contract = $lockedCandidate->form->contracts->first();
                    if (! $contract) {
                        throw new \Exception('No contract template available for signing.');
                    }

                    $this->contractGenService->generateContract($lockedCandidate, $contract);

                    $latest = GeneratedContract::where('candidate_id', $lockedCandidate->id)
                        ->where('form_contract_id', $contract->id)
                        ->latest('generated_at')
                        ->first();

                    if (! $latest) {
                        throw new \Exception('Failed to generate base contract for signing.');
                    }

                    $sourcePath = storage_path('app/secure/'.$latest->file_path);
                    $filename = basename($latest->file_path);
                }

                // Generate a new filename for the signed version
                $filename = $lockedCandidate->id.'_'.($latest->form_contract_id ?? '0').'_signed_'.time().'.pdf';

                $signedPath = storage_path('app/secure/generated_contracts/signed/'.$filename);

                if (! file_exists(dirname($signedPath))) {
                    mkdir(dirname($signedPath), 0755, true);
                }

                // Embed signatures
                $this->embedSignatures($sourcePath, $signedPath, $overlays);

                // STEP 5: Atomic Update with Version Check
                $updated = Candidate::where('id', $lockedCandidate->id)
                    ->where('version', $currentVersion)
                    ->update([
                        'contract_status' => 'signed',
                        'contract_path' => 'generated_contracts/signed/'.$filename,
                        'contract_signed_at' => now(),
                        'signed_by_user_id' => $user->id,
                        'version' => $currentVersion + 1,
                        // Clear soft lock
                        'signing_in_progress_by' => null,
                        'signing_started_at' => null,
                        'signing_session_id' => null,
                    ]);

                if ($updated === 0) {
                    throw new \RuntimeException('Contract was modified by another user. Please refresh and try again.');
                }

                $this->auditService->log('contract_signed', $lockedCandidate, [
                    'filename' => $filename,
                    'signed_path' => 'generated_contracts/signed/'.$filename,
                ]);

                return true;
            } catch (\Exception $e) {
                // Release soft lock on failure
                $this->releaseSoftLock($lockedCandidate);
                throw $e;
            }
        }, 5);
    }

    protected function embedSignatures(string $sourcePath, string $destPath, array $overlays): void
    {
        $pdf = new TcpdfFpdi;
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false);

        $pageCount = $pdf->setSourceFile($sourcePath);

        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
            $templateId = $pdf->importPage($pageNo);
            $size = $pdf->getTemplateSize($templateId);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height'], true);

            Log::info("EmbedSignatures: Page $pageNo Size - W: {$size['width']} H: {$size['height']}");

            foreach ($overlays as $overlay) {
                if (isset($overlay['placement']['page']) && $overlay['placement']['page'] === $pageNo) {
                    $x = ($overlay['placement']['x'] / 100) * $size['width'];
                    $y = ($overlay['placement']['y'] / 100) * $size['height'];

                    Log::info("EmbedSignatures: Placing overlay type '{$overlay['type']}' at X:$x Y:$y (Calc from {$overlay['placement']['x']}%, {$overlay['placement']['y']}%)");

                    if ($overlay['type'] === 'image' || $overlay['type'] === 'drawn') { // Adapt types
                        $val = $overlay['value'];
                        try {
                            if (strpos($val, 'base64,') !== false) {
                                Log::info('EmbedSignatures: Decoding base64 signature.');
                                $imageData = explode('base64,', $val);
                                $imageBinary = base64_decode($imageData[1]);

                                $pdf->Image('@'.$imageBinary, $x - 20, $y - 10, 40, 0, 'PNG');
                                Log::info('EmbedSignatures: Base64 image embedded.');
                            } else {
                                // Handle URL or path
                                Log::info('EmbedSignatures: Handling URL/Path signature: '.substr($val, 0, 50));
                                $imageContent = null;

                                // CONVENIENCE: If it's a local storage URL, read it from disk to avoid deadlock
                                // (especially on 'php artisan serve' which is single threaded)
                                if (strpos($val, '/storage/') !== false) {
                                    $storagePath = \Illuminate\Support\Str::after($val, '/storage/');
                                    if (\Illuminate\Support\Facades\Storage::disk('public')->exists($storagePath)) {
                                        $imageContent = \Illuminate\Support\Facades\Storage::disk('public')->get($storagePath);
                                        Log::info("EmbedSignatures: Resolved local storage path: $storagePath");
                                    }
                                }

                                // FALLBACK: External URL (but avoid calling ourselves if possible)
                                if (! $imageContent && filter_var($val, FILTER_VALIDATE_URL)) {
                                    // If URL contains our own host, it's still a local file we missed or a dynamic route
                                    $appUrl = config('app.url');
                                    if (strpos($val, $appUrl) === 0 || strpos($val, 'localhost') !== false) {
                                        Log::error("EmbedSignatures: Detected HTTP request to itself. Avoiding deadlock for $val");
                                    } else {
                                        try {
                                            $imageContent = file_get_contents($val, false, stream_context_create([
                                                'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
                                                'http' => ['timeout' => 5],
                                            ]));
                                            Log::info('EmbedSignatures: Fetched external image.');
                                        } catch (\Exception $e) {
                                            Log::error("Failed to fetch signature URL: $val ".$e->getMessage());
                                        }
                                    }
                                }

                                if ($imageContent) {
                                    $pdf->Image('@'.$imageContent, $x - 20, $y - 10, 40, 0, 'PNG');
                                    Log::info('EmbedSignatures: URL image embedded.');
                                } else {
                                    Log::warning('EmbedSignatures: Could not resolve signature image: '.substr($val, 0, 50));
                                }
                            }
                        } catch (\Exception $e) {
                            Log::error('Failed to embed signature: '.$e->getMessage());
                        }
                    } else {
                        Log::info("EmbedSignatures: Embedding text: {$overlay['value']}");
                        $pdf->SetFont('courier', 'B', 16);
                        $pdf->SetXY($x - 20, $y - 5);
                        $pdf->Cell(40, 10, $overlay['value'], 0, 0, 'C');
                    }
                }
            }
        }

        $pdf->Output($destPath, 'F');
    }

    /**
     * Acquire soft lock with heartbeat check
     */
    public function acquireSoftLock(Candidate $candidate, User $user, ?string $sessionId = null): void
    {
        $heartbeatTimeout = 60; // 60 seconds without signal = unlock

        if ($candidate->signing_in_progress_by) {
            // IF it's the SAME user, allowed
            if ($candidate->signing_in_progress_by == $user->id) {
                // Allowed to takeover/extend
            } else {
                // Check if the current lock is stale via last_ping_at
                $lastActivity = $candidate->last_ping_at ?: $candidate->signing_started_at;
                $idleSeconds = $lastActivity ? now()->diffInSeconds($lastActivity) : 9999;

                if ($idleSeconds > $heartbeatTimeout) {
                    Log::info("Force releasing stale signing lock (no heartbeat for {$idleSeconds}s)", [
                        'candidate_id' => $candidate->id,
                        'locked_by' => $candidate->signing_in_progress_by,
                    ]);

                    $candidate->update([
                        'signing_in_progress_by' => null,
                        'signing_started_at' => null,
                        'signing_session_id' => null,
                        'last_ping_at' => null,
                    ]);
                } else {
                    $lockedBy = User::find($candidate->signing_in_progress_by);
                    throw new \RuntimeException(
                        "Contract is currently being signed by {$lockedBy->name}. ".
                        'It will become available if they leave the page for more than 15 seconds.'
                    );
                }
            }
        }

        // Acquire/Refresh lock
        $candidate->update([
            'signing_in_progress_by' => $user->id,
            'signing_started_at' => $candidate->signing_started_at ?: now(),
            'last_ping_at' => now(),
            'signing_session_id' => $sessionId,
        ]);
    }

    /**
     * Update heartbeat for active lock
     */
    public function pingSoftLock(Candidate $candidate, User $user, ?string $sessionId = null): void
    {
        // Only update if this user actually holds the lock
        if ($candidate->signing_in_progress_by == $user->id) {
            $candidate->update([
                'last_ping_at' => now(),
                // Keep session ID alive or update if it was missing
                'signing_session_id' => $candidate->signing_session_id ?: $sessionId,
            ]);
        }
    }

    /**
     * Release soft lock
     */
    public function releaseSoftLock(Candidate $candidate, ?string $sessionId = null): void
    {
        // If the database has a session ID, then the release request MUST match it.
        // If the database has NO session ID, we allow the release (likely an old lock or transitionary state).
        if ($sessionId && $candidate->signing_session_id && $candidate->signing_session_id !== $sessionId) {
            Log::info('Soft lock ignore: release attempted for old/mismatched session', [
                'candidate_id' => $candidate->id,
                'target_session' => $sessionId,
                'current_session' => $candidate->signing_session_id,
                'user_id' => auth()->id(),
            ]);

            return;
        }

        $candidate->update([
            'signing_in_progress_by' => null,
            'signing_started_at' => null,
            'signing_session_id' => null,
            'last_ping_at' => null,
        ]);
    }
}
