<?php

namespace App\Services;

use App\Modules\Forms\Models\GeneratedContract;
use App\Modules\Signing\Models\DocumentSignature;
use Illuminate\Support\Facades\Log;

class SignatureSecurityService
{
    /**
     * Generate cryptographic HMAC-SHA256 hash for a signature payload
     */
    public function generateSignatureHash(array $payload): string
    {
        $appKey = config('app.key', 'default-secret-key-signature');

        // Normalize payload into canonical sorted string
        $canonicalPayload = [
            'signer_id' => $payload['signer_id'] ?? 'unknown',
            'signer_email' => $payload['signer_email'] ?? 'unknown',
            'signer_role' => $payload['signer_role'] ?? 'candidate',
            'contract_id' => $payload['contract_id'] ?? 0,
            'pdf_checksum' => $payload['pdf_checksum'] ?? '',
            'signed_at' => $payload['signed_at'] ?? '',
            'ip_address' => $payload['ip_address'] ?? '0.0.0.0',
        ];

        ksort($canonicalPayload);

        $payloadString = json_encode($canonicalPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return hash_hmac('sha256', $payloadString, $appKey);
    }

    /**
     * Calculate SHA-256 checksum of a file on disk
     */
    public function calculateFileChecksum(string $filePath): ?string
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return null;
        }

        return hash_file('sha256', $filePath);
    }

    /**
     * Verify authenticity and integrity of a GeneratedContract
     */
    public function verifyGeneratedContract(GeneratedContract $contract): array
    {
        $metadata = $contract->signature_metadata ?? [];
        $storedHash = $contract->signature_hash ?? ($metadata['signature_hash'] ?? null);
        $storedChecksum = $contract->pdf_checksum ?? ($metadata['pdf_checksum'] ?? null);

        if (!$storedHash) {
            return [
                'is_valid' => false,
                'status' => 'UNVERIFIED',
                'message' => 'No cryptographic signature hash exists for this document.',
                'contract_id' => $contract->id,
            ];
        }

        // 1. Verify File Checksum on Disk
        $diskPath = $contract->signed_path ? storage_path('app/secure/' . $contract->signed_path) : null;
        $currentChecksum = $diskPath ? $this->calculateFileChecksum($diskPath) : null;

        $fileTampered = false;
        if ($storedChecksum && $currentChecksum !== $storedChecksum) {
            $fileTampered = true;
        }

        // 2. Re-verify HMAC Hash
        $recalculatedHash = $this->generateSignatureHash([
            'signer_id' => $metadata['admin_signed_by'] ?? ($contract->candidate_id ?? 'candidate'),
            'signer_email' => $contract->candidate->email ?? 'candidate@signme.com',
            'signer_role' => isset($metadata['admin_signed']) ? 'admin' : 'candidate',
            'contract_id' => $contract->form_contract_id ?? $contract->id,
            'pdf_checksum' => $storedChecksum,
            'signed_at' => $contract->signed_at ? $contract->signed_at->toIso8601String() : ($metadata['candidate_signed_at'] ?? ''),
            'ip_address' => $metadata['ip_address'] ?? '0.0.0.0',
        ]);

        $hashMatch = hash_equals($storedHash, $recalculatedHash);
        $isValid = !$fileTampered && $hashMatch;

        return [
            'is_valid' => $isValid,
            'status' => $isValid ? 'VERIFIED_AUTHENTIC' : ($fileTampered ? 'FILE_TAMPERED' : 'HASH_MISMATCH'),
            'message' => $isValid
                ? 'Signature is cryptographically authentic and file integrity is intact.'
                : ($fileTampered
                    ? 'CRITICAL SECURITY ALERT: Signed PDF document has been modified after signing!'
                    : 'CRITICAL SECURITY ALERT: Cryptographic signature payload has been tampered with!'),
            'contract_id' => $contract->id,
            'candidate_name' => $contract->candidate->name ?? 'Candidate',
            'candidate_email' => $contract->candidate->email ?? null,
            'signed_at' => $contract->signed_at ? $contract->signed_at->toIso8601String() : null,
            'signature_hash' => $storedHash,
            'pdf_checksum' => $storedChecksum,
            'current_disk_checksum' => $currentChecksum,
            'tampered' => $fileTampered,
        ];
    }
}
