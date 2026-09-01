<?php

namespace Tests\Feature;

use App\Mail\CandidateSignatureRequest;
use App\Models\User;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\Form;
use App\Modules\Forms\Models\FormContract;
use App\Modules\Forms\Models\GeneratedContract;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CandidateSignatureFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_candidate_signature_flow()
    {
        Storage::fake('secure');
        Storage::fake('public');
        Mail::fake();

        // 1. Setup Data
        $admin = User::factory()->create();
        $role = Role::create(['name' => 'admin']);
        $admin->assignRole($role);

        $form = Form::create(['name' => 'Test Form', 'status' => 'published']);
        $contract = FormContract::create([
            'form_id' => $form->id,
            'name' => 'Test Contract',
            'file_path' => 'templates/contract.pdf',
            'placeholders' => [],
        ]);

        // Create dummy PDF template
        if (! Storage::disk('secure')->exists('templates/contract.pdf')) {
            // Create a minimal valid PDF
            $pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000157 00000 n\n0000000307 00000 n\n0000000392 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n486\n%%EOF\n";
            Storage::disk('secure')->put('templates/contract.pdf', $pdfContent);
        }

        $candidate = Candidate::create([
            'first_name' => 'John',
            'last_name' => 'Can',
            'email' => 'john@example.com',
            'form_id' => $form->id,
            'contract_status' => 'pending',
            'data' => [],
        ]);

        // 2. Admin Sends Signature Request
        $response = $this->actingAs($admin)
            ->postJson("/api/candidates/{$candidate->id}/send-signature-request");

        $response->assertOk();
        $response->assertJsonFragment(['message' => 'Signature request sent successfully.']);

        $candidate->refresh();
        $this->assertNotNull($candidate->signing_token);
        $this->assertEquals('pending_candidate_signature', $candidate->contract_status);
        $this->assertNotNull($candidate->sent_for_signature_at);

        Mail::assertSent(CandidateSignatureRequest::class, function ($mail) use ($candidate) {
            return $mail->hasTo('john@example.com') &&
                   $mail->candidate->id === $candidate->id;
        });

        $token = $candidate->signing_token;

        // 3. Guest (Candidate) Views Contract Publicly
        $response = $this->getJson("/api/public/candidate/{$token}");

        $response->assertOk();
        $response->assertJsonFragment(['candidate_name' => 'John Can']);
        $response->assertJsonStructure(['contracts', 'active_contract_id']);

        // 4. Guest (Candidate) Signs Contract
        // We need to ensure GeneratedContract exists or flow creates it.
        // Logic: signContract will check if generated path exists, else generate.
        // It needs a 'source' file.
        // Mocking the generation to ensure 'file_path' is set?
        // Actually the Service should handle it.

        // Mock FPDI/TCPDF?
        // It's hard to mock external libs inside the service without Dependency Injection or Facades.
        // The service uses `new TcpdfFpdi`.
        // However, we provided a valid PDF content above, so it MIGHT work if the env has ghostscript/etc but it's PHP library.
        // TCpdf requires valid PDF. My dummy PDF should be barely valid.

        // Let's assume it works or catch exception.

        $sigData = [
            'signatures' => [
                [
                    'type' => 'text',
                    'value' => 'Candidate Signature',
                    'placement' => ['x' => 10, 'y' => 10, 'page' => 1],
                ],
            ],
            'form_contract_id' => $contract->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'TestAgent',
        ];

        $response = $this->postJson("/api/public/candidate/{$token}/sign", $sigData);

        if ($response->status() === 500) {
            // If PDF error, we might skip implementation test of PDF generation and just check logic
            // But let's see.
            fwrite(STDERR, $response->content());
        }

        $response->assertOk();
        $response->assertJson(['message' => 'Contract signed successfully']);

        // 5. Verify Status Updates
        $candidate->refresh();

        // Should be 'pending_admin_signature' because candidate signed it.
        $this->assertEquals('pending_admin_signature', $candidate->contract_status);
        $this->assertNotNull($candidate->signed_by_candidate_at);

        $generated = GeneratedContract::where('candidate_id', $candidate->id)->first();
        $this->assertNotNull($generated);
        $this->assertTrue($generated->signature_metadata['candidate_signed']);
        // Status should NOT be 'signed' yet (waiting for admin)
        $this->assertNotEquals('signed', $generated->status);

        // 6. Admin Signs Contract
        $response = $this->actingAs($admin)
            ->postJson("/api/candidates/{$candidate->id}/sign-contract", $sigData); // Reuse data

        $response->assertOk();

        $candidate->refresh();
        $this->assertEquals('signed', $candidate->contract_status);
        $this->assertEquals($admin->id, $candidate->signed_by_user_id);
    }
}
