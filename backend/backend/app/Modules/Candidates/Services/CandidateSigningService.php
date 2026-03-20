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

    public function signContract(Candidate $candidate, ?User $user, array $data): bool
    {
        return DB::transaction(function () use ($candidate, $user, $data) {
            $overlays = $data['signatures'] ?? [];
            $formContractId = $data['form_contract_id'] ?? null;
            $isCandidateSigning = is_null($user);

            // STEP 1: Pessimistic Lock - Lock the row for update
            $lockedCandidate = Candidate::where('id', $candidate->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedCandidate) {
                throw new \Exception('Candidate not found');
            }

            // STEP 2: Check and acquire soft lock (Scope lock to candidate for simplicity, even if signing one contract)
            // If candidate is signing, we don't use user-based soft lock in the same way, or we use a separate mechanism?
            // For now, if it's candidate, we pass null user to acquireSoftLock or handle it?
            // acquireSoftLock expects User. Let's adjust it or skip it for candidate?
            // Candidate signing is usually single-threaded by the user themselves.
            // But to prevent admin from signing while candidate is signing, we should lock.
            // We can treat candidate as a special "user" or just check lock.

            if ($user) {
                $this->acquireSoftLock($lockedCandidate, $user, $data['session_id'] ?? null);
            } else {
                // Check if locked by ADMIN
                if ($lockedCandidate->signing_in_progress_by) {
                    throw new \RuntimeException('Contract is currently being edited by an admin.');
                }
                // We don't necessarily set 'signing_in_progress_by' for candidate,
                // or we could use a flag. For simplicity, we skip soft lock for candidate if no admin is there.
            }

            // STEP 3: Identify the specific contract to sign
            $lockedCandidate->load('form.contracts');

            if ($formContractId) {
                $contractDef = $lockedCandidate->form->contracts->where('id', $formContractId)->first();
            } else {
                // Fallback: Default to first contract if none specified (backward compatibility)
                $contractDef = $lockedCandidate->form->contracts->first();
            }

            if (! $contractDef) {
                throw new \Exception('Contract definition not found.');
            }

            // Check if THIS contract is already signed
            // Logic change: A contract might need TWO signatures (Candidate AND Admin).
            // But `GeneratedContract` status 'signed' implies it's done?
            // If we want double signature on the SAME PDF, we need to append signatures.
            // Current system: `GeneratedContract` -> `status` 'signed'.
            // If candidate signs, is it "signed"? or "candidate_signed"?
            // Complexity: If we use the SAME `GeneratedContract` record for both, we need distinct statuses or flags.
            // Assumption: The PDF is generated, Candidate signs it -> `GeneratedContract` status 'signed_by_candidate'?
            // OR we just append signature and keep status 'pending' until FINAL signature?

            // SIMPLIFICATION:
            // 1. Candidate signs -> PDF updated with signature. Status remains 'pending' OR 'candidate_signed'.
            // 2. Admin signs -> PDF updated with signature. Status becomes 'signed'.

            // Let's check `GeneratedContract` schema. It has `status` enum ('pending', 'signed', 'rejected').
            // We might need 'partial' or just rely on metadata.

            // To support this without massive schema changes:
            // If `isCandidateSigning`:
            //    - Embed signature.
            //    - Update `status` to 'signed' IF no admin signature is required?
            //    - Wait, requirement says "then the sign contract apears" for admin. So Admin MUST sign too.
            //    - So `GeneratedContract` is NOT fully signed yet.
            //    - We need to know if it's "Candidate Signed" to show it to Admin.

            // Let's use `signature_metadata`.

            $existingGenerated = GeneratedContract::where('candidate_id', $lockedCandidate->id)
                ->where('form_contract_id', $contractDef->id)
                ->latest('generated_at')
                ->first();

            $alreadyCandidateSigned = $existingGenerated && ($existingGenerated->signature_metadata['candidate_signed'] ?? false);

            if ($isCandidateSigning && $alreadyCandidateSigned) {
                throw new \RuntimeException('You have already signed this contract.');
            }

            // If Admin signing, we check if it is already fully signed
            if (! $isCandidateSigning && $existingGenerated && $existingGenerated->status === 'signed') {
                throw new \RuntimeException('This contract is already fully signed.');
            }

            // STEP 4: Get or Generate the PDF to be signed
            if ($existingGenerated && file_exists(storage_path('app/secure/'.$existingGenerated->file_path))) {
                // If we have a 'signed_path' (e.g. candidate signed first), we should use THAT as source for the next signature?
                // Yes, if candidate signed, `signed_path` has their signature. Admin should sign THAT.
                if ($existingGenerated->signed_path && file_exists(storage_path('app/secure/'.$existingGenerated->signed_path))) {
                    $sourcePath = storage_path('app/secure/'.$existingGenerated->signed_path);
                } else {
                    $sourcePath = storage_path('app/secure/'.$existingGenerated->file_path);
                }
            } else {
                // Generate now
                $this->contractGenService->generateContract($lockedCandidate, $contractDef);

                $existingGenerated = GeneratedContract::where('candidate_id', $lockedCandidate->id)
                    ->where('form_contract_id', $contractDef->id)
                    ->latest('generated_at')
                    ->first();

                if (! $existingGenerated) {
                    throw new \Exception('Failed to generate contract.');
                }
                $sourcePath = storage_path('app/secure/'.$existingGenerated->file_path);
            }

            // Generate a new filename for the signed version
            $filename = $lockedCandidate->id.'_'.$contractDef->id.'_signed_'.time().'.pdf';
            $signedPathRel = 'generated_contracts/signed/'.$filename;
            $signedPath = storage_path('app/secure/'.$signedPathRel);

            if (! file_exists(dirname($signedPath))) {
                mkdir(dirname($signedPath), 0755, true);
            }

            // Embed signatures
            $this->embedSignatures($sourcePath, $signedPath, $overlays);

            // STEP 5: Update GeneratedContract Record
            $metadata = $existingGenerated->signature_metadata ?? [];
            if ($isCandidateSigning) {
                $metadata['candidate_signed'] = true;
                $metadata['candidate_signed_at'] = now()->toIso8601String();
            } else {
                $metadata['admin_signed'] = true;
                $metadata['admin_signed_by'] = $user->id;
                $metadata['admin_signed_at'] = now()->toIso8601String();
            }
            $metadata['ip_address'] = $data['ip_address'] ?? null;
            $metadata['user_agent'] = $data['user_agent'] ?? null;

            $updateData = [
                'signed_path' => $signedPathRel, // Always update to latest signed version
                'signature_metadata' => $metadata,
            ];

            // Determine if fully completed for this specific contract
            // For now, let's assume if Admin signs, it's done.
            // If Candidate signs, it's NOT done (status remains pending or we need a new status).
            // Keeping 'pending' but with 'candidate_signed' metadata allows Admin to see it.

            if (! $isCandidateSigning) {
                // Admin signed -> Fully signed
                $updateData['status'] = 'signed';
                $updateData['signed_at'] = now();
                $updateData['signed_by_user_id'] = $user ? $user->id : null;
            }

            $existingGenerated->update($updateData);

            // STEP 6: Update Candidate Status
            // Check if ALL contracts are signed by CANDIDATE
            $allContractIds = $lockedCandidate->form->contracts->pluck('id');

            // Get all generated contracts for these IDs
            $allGenerated = GeneratedContract::where('candidate_id', $lockedCandidate->id)
                ->whereIn('form_contract_id', $allContractIds)
                ->get()
                ->keyBy('form_contract_id');

            $allCandidateSigned = true;
            $allFullySigned = true;

            foreach ($allContractIds as $cId) {
                $gen = $allGenerated[$cId] ?? null;
                if (! $gen) {
                    $allCandidateSigned = false;
                    $allFullySigned = false;
                    break;
                }
                $meta = $gen->signature_metadata ?? [];
                if (! ($meta['candidate_signed'] ?? false)) {
                    $allCandidateSigned = false;
                }
                if ($gen->status !== 'signed') { // 'signed' means Admin signed
                    $allFullySigned = false;
                }
            }

            if ($allFullySigned) {
                $lockedCandidate->update([
                    'contract_status' => 'signed',
                    'contract_path' => $signedPathRel,
                    'contract_signed_at' => now(),
                    'signed_by_user_id' => $user ? $user->id : null,
                    'signing_in_progress_by' => null,
                    'signing_started_at' => null,
                    'signing_session_id' => null,
                ]);

                // Collect all final signed paths
                $contractPaths = [];
                foreach ($allGenerated as $id => $gen) {
                    if ($id == $contractDef->id) {
                        $contractPaths[] = $signedPathRel;
                    } elseif ($gen->signed_path) {
                        $contractPaths[] = $gen->signed_path;
                    }
                }

                // Trigger completion email
                if ($lockedCandidate->email) {
                    \Illuminate\Support\Facades\Mail::to($lockedCandidate->email)
                        ->send(new \App\Mail\ContractCompletedNotification(
                            $lockedCandidate,
                            $contractPaths,
                            $lockedCandidate->form->completion_attachment_path ?? null
                        ));
                }
            } elseif ($allCandidateSigned && $isCandidateSigning) {
                // All signed by candidate, ready for admin
                $lockedCandidate->update([
                    'contract_status' => 'pending_admin_signature',
                    'signed_by_candidate_at' => now(),
                ]);
            }

            if ($user) {
                $this->releaseSoftLock($lockedCandidate, $data['session_id'] ?? null);
            }

            $this->auditService->log('contract_signed', $lockedCandidate, [
                'filename' => $filename,
                'signed_path' => $signedPathRel,
                'contract_name' => $contractDef->name,
                'signed_by' => $isCandidateSigning ? 'candidate' : 'admin',
            ]);

            return true;
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
                if (isset($overlay['placement']['page']) && (int) $overlay['placement']['page'] === $pageNo) {
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

                                if ($imageBinary === false) {
                                    Log::error('EmbedSignatures: Base64 decode failed for value mapping.');

                                    continue;
                                }

                                // Center the image (assuming roughly 40mm width, 20mm height)
                                $w = 40;
                                $h = 20; // estimate
                                $finalX = max(0, $x - ($w / 2));
                                $finalY = max(0, $y - ($h / 2));

                                $pdf->Image('@'.$imageBinary, $finalX, $finalY, $w, 0, 'PNG');
                                Log::info("EmbedSignatures: Base64 image embedded at X:$finalX Y:$finalY");
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
                                            $imageContent = @file_get_contents($val, false, stream_context_create([
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
                                    $w = 40;
                                    $h = 20;
                                    $finalX = max(0, $x - ($w / 2));
                                    $finalY = max(0, $y - ($h / 2));

                                    $pdf->Image('@'.$imageContent, $finalX, $finalY, $w, 0, 'PNG');
                                    Log::info("EmbedSignatures: URL image embedded at X:$finalX Y:$finalY");
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
                'user_id' => \Illuminate\Support\Facades\Auth::id(),
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
