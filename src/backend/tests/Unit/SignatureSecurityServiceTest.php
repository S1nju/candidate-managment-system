<?php

namespace Tests\Unit;

use App\Services\SignatureSecurityService;
use Tests\TestCase;

class SignatureSecurityServiceTest extends TestCase
{
    protected SignatureSecurityService $securityService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->securityService = new SignatureSecurityService();
    }

    public function test_generates_consistent_hmac_sha256_hash(): void
    {
        $payload = [
            'signer_id' => 123,
            'signer_email' => 'candidate@example.com',
            'signer_role' => 'candidate',
            'contract_id' => 45,
            'pdf_checksum' => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            'signed_at' => '2026-09-01T12:00:00Z',
            'ip_address' => '127.0.0.1',
        ];

        $hash1 = $this->securityService->generateSignatureHash($payload);
        $hash2 = $this->securityService->generateSignatureHash($payload);

        $this->assertNotEmpty($hash1);
        $this->assertEquals(64, strlen($hash1));
        $this->assertEquals($hash1, $hash2);
    }

    public function test_detects_altered_file_checksum(): void
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'sig_test_');
        file_put_contents($tempFile, 'Original PDF Content');

        $checksum1 = $this->securityService->calculateFileChecksum($tempFile);
        $this->assertNotEmpty($checksum1);

        // Alter file content (tampering simulation)
        file_put_contents($tempFile, 'Tampered PDF Content!');
        $checksum2 = $this->securityService->calculateFileChecksum($tempFile);

        $this->assertNotEquals($checksum1, $checksum2);

        @unlink($tempFile);
    }
}
