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
        // The signing service resolves files with storage_path('app/secure/...'), so this test
        // uses the real 'secure' disk and removes whatever it creates.
        $secureFilesBefore = Storage::disk('secure')->allFiles();
        $this->beforeApplicationDestroyed(function () use ($secureFilesBefore) {
            $created = array_diff(Storage::disk('secure')->allFiles(), $secureFilesBefore);
            Storage::disk('secure')->delete(array_values($created));
        });
        Storage::fake('public');
        Mail::fake();

        // 1. Setup Data
        $admin = User::factory()->create();
        $role = Role::create(['name' => 'admin']);
        $admin->assignRole($role);

        $form = Form::create(['title' => 'Test Form', 'status' => 'active', 'created_by' => $admin->id]);
        $contract = FormContract::create([
            'form_id' => $form->id,
            'name' => 'Test Contract',
            'template_path' => 'templates/contract.pdf',
            'placeholders' => [],
        ]);

        // Create a valid one-page PDF template
        $pdf = new \setasign\Fpdi\TcpdfFpdi;
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->AddPage();
        $pdf->Write(0, 'Hello World');
        Storage::disk('secure')->put('templates/contract.pdf', $pdf->Output('', 'S'));

        $candidate = Candidate::create([
            'name' => 'Can',
            'email' => 'john@example.com',
            'form_id' => $form->id,
            'contract_status' => 'pending',
            'data' => ['prénom(s)' => 'John'],
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
